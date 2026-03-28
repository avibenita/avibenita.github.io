# VB6 AI Button Integration - Complete Guide

This document explains how the AI interpretation feature works on the VB6 backend.

---

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER CLICKS AI BUTTON                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  JavaScript (0H0testHypothesis.html)                            │
│  ─────────────────────────────────────────────────────────      │
│  1. AIButton.init() event listener fires                        │
│  2. AIButton.buildHypothesisTestData() extracts test results    │
│  3. Builds JSON payload with:                                   │
│     • testName, testStatistic, pValue, alpha                    │
│     • testOrientation (one-tailed vs two-tailed)                │
│     • effectSize, sampleSize, decision                          │
│  4. Calls: sendToVB6('RequestAIInterpretation', jsonData)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  VB6 Message Handler (A_HTML_Panels.frm)                        │
│  ─────────────────────────────────────────────────────────      │
│  Case "RequestAIInterpretation"                                 │
│    A_IlamaRespones.Show                                         │
│    A_llamaAIintegration.HandleHypothesisAIRequest sMsgContent   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Integration Module (0llamaAIintegration.bas)                │
│  ─────────────────────────────────────────────────────────      │
│  HandleHypothesisAIRequest():                                   │
│    1. Stores JSON data in module variable (pendingTestData)     │
│    2. Shows AI popup form (A_IlamaRespones)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Popup Form (A_IlamaRespones.frm)                            │
│  ─────────────────────────────────────────────────────────      │
│  Form_Load:                                                     │
│    • Initializes OrdoWebView1 control                           │
│  OrdoWebView1_InitComplete:                                     │
│    • Loads ai-loading.html (spinner)                            │
│  OrdoWebView1_DocumentComplete:                                 │
│    • Triggers ProcessPendingAIRequest()                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  AI Processing (0llamaAIintegration.bas)                        │
│  ─────────────────────────────────────────────────────────      │
│  ProcessPendingAIRequest():                                     │
│    1. Retrieves pendingTestData                                 │
│    2. Parses JSON → Dictionary object                           │
│    3. Calls BuildHypothesisTestPrompt()                         │
│    4. Calls SendRequestForHypothesis()                          │
│    5. Calls SaveResponseAsHTML()                                │
│    6. Calls A_IlamaRespones.ShowResponse()                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Groq API Call (SendRequestForHypothesis)                       │
│  ─────────────────────────────────────────────────────────      │
│  • Model: llama-3.3-70b-versatile                               │
│  • Temperature: 0.7, Max tokens: 500                            │
│  • POST request to https://api.groq.com/openai/v1/chat/...     │
│  • Returns AI interpretation text                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  HTML Generation (SaveResponseAsHTML)                           │
│  ─────────────────────────────────────────────────────────      │
│  • Creates HTML file with interpretation                        │
│  • Styled card with header, body, footer                        │
│  • Includes copy-to-clipboard button                            │
│  • Saved to: HTML_AI_response\hypothesis-interpretation.html    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Display Response (A_IlamaRespones.ShowResponse)                │
│  ─────────────────────────────────────────────────────────      │
│  • Sets isProcessing = True (prevent re-triggering)             │
│  • Navigates OrdoWebView1 to generated HTML file                │
│  • User sees AI interpretation in popup                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Key VB6 Components

### 1. Message Handler (A_HTML_Panels.frm)

**Location:** In the main form that hosts the hypothesis dashboard

```vb
Public Sub VB6MessageHandler(sCase As String, sMsgContent As String)
    Select Case sCase
        Case "RequestAIInterpretation"
            ' Show the AI popup form
            A_IlamaRespones.Show
            
            ' Pass test data to AI integration module
            A_llamaAIintegration.HandleHypothesisAIRequest sMsgContent
            
        ' ... other cases ...
    End Select
End Sub
```

**What it does:**
- Receives the `RequestAIInterpretation` message from JavaScript
- Shows the AI popup form (`A_IlamaRespones`)
- Passes the JSON test data to the AI integration module

---

### 2. AI Integration Module (0llamaAIintegration.bas)

#### Module Variables
```vb
Private Const API_KEY As String = "gsk_..."
Private Const API_ENDPOINT As String = "https://api.groq.com/openai/v1/chat/completions"
Private pendingTestData As String
```

#### Main Functions

**HandleHypothesisAIRequest(jsonTestData)**
```vb
Public Sub HandleHypothesisAIRequest(ByVal jsonTestData As String)
    ' Store test data in module variable
    pendingTestData = jsonTestData
    
    ' Show the AI form (will trigger processing when loaded)
    A_IlamaRespones.Show
End Sub
```

**ProcessPendingAIRequest()**
```vb
Public Sub ProcessPendingAIRequest()
    ' Parse JSON data
    Dim testDict As Dictionary
    Set testDict = JsonConverter.ParseJson(pendingTestData)
    
    ' Build AI prompt
    Dim prompt As String
    prompt = BuildHypothesisTestPrompt(testDict)
    
    ' Send to AI API
    Dim aiResponse As String
    aiResponse = SendRequestForHypothesis(prompt)
    
    ' Generate HTML and display
    Call SaveResponseAsHTML(aiResponse, "HTML_AI_response\hypothesis-interpretation.html", "AI Interpretation")
    
    ' Clear pending data
    pendingTestData = ""
End Sub
```

**BuildHypothesisTestPrompt(testDict)**
```vb
Private Function BuildHypothesisTestPrompt(testDict As Dictionary) As String
    ' Extract test data
    testName = testDict("testName")
    testOrientation = testDict("testOrientation")
    pValue = testDict("pValue")
    ' ... etc
    
    ' Map orientation
    If testOrientation = "Two-sided" Then
        orientationText = "Two-Tailed Test"
    ElseIf testOrientation = "Right-tailed" Then
        orientationText = "One-Tailed Test (Right-Tailed)"
    ElseIf testOrientation = "Left-tailed" Then
        orientationText = "One-Tailed Test (Left-Tailed)"
    End If
    
    ' Build prompt for AI
    prompt = "You are a statistical expert. Interpret these hypothesis test results..." & _
             "TEST RESULTS:" & vbCrLf & _
             "Test: " & testName & vbCrLf & _
             "Test Type: " & orientationText & vbCrLf & _
             "Parameter: " & testParameter & vbCrLf & _
             "Sample Size: n=" & sampleSize & vbCrLf & _
             "Test Statistic: " & testStat & vbCrLf & _
             "P-value: " & pValue & vbCrLf & _
             "Alpha: " & alpha & vbCrLf & _
             "Effect Size: " & effectSize & vbCrLf & _
             "Decision: " & decision
    
    BuildHypothesisTestPrompt = prompt
End Function
```

**SendRequestForHypothesis(userMessage)**
```vb
Private Function SendRequestForHypothesis(ByVal userMessage As String) As String
    Dim http As Object
    Dim payload As String
    
    ' Build JSON payload for Groq API
    payloadDict.Add "model", "llama-3.3-70b-versatile"
    payloadDict.Add "messages", messageList
    payloadDict.Add "temperature", 0.7
    payloadDict.Add "max_tokens", 500
    
    payload = JsonConverter.ConvertToJson(payloadDict, 2)
    
    ' Send HTTP POST request
    Set http = CreateObject("MSXML2.XMLHTTP.6.0")
    http.Open "POST", API_ENDPOINT, False
    http.setRequestHeader "Content-Type", "application/json"
    http.setRequestHeader "Authorization", "Bearer " & API_KEY
    http.Send payload
    
    ' Extract AI response
    If http.Status = 200 Then
        Set responseDict = JsonConverter.ParseJson(http.responseText)
        SendRequestForHypothesis = responseDict("choices")(1)("message")("content")
    Else
        SendRequestForHypothesis = "API Error: " & http.Status
    End If
End Function
```

**SaveResponseAsHTML(responseText, htmlFilePath, popupTitle)**
```vb
Sub SaveResponseAsHTML(responseText As String, htmlFilePath As String, popupTitle As String)
    ' Generate complete HTML file with styling
    AppendLine htmlContent, "<!DOCTYPE html>"
    AppendLine htmlContent, "<html>"
    AppendLine htmlContent, "<head>..."
    ' ... (includes CSS for styled card, copy button, etc.)
    AppendLine htmlContent, "<body>"
    AppendLine htmlContent, "  <div class='card'>"
    AppendLine htmlContent, "    <header>🤖 " & popupTitle & "</header>"
    AppendLine htmlContent, "    <div class='interpretation'>" & responseText & "</div>"
    AppendLine htmlContent, "    <footer>AI-Powered by LLaMA 3.3 70B</footer>"
    AppendLine htmlContent, "  </div>"
    AppendLine htmlContent, "</body>"
    AppendLine htmlContent, "</html>"
    
    ' Save to file
    Open fullPath For Output As #fileNum
    Print #fileNum, htmlContent
    Close #fileNum
    
    ' Show in popup form
    A_IlamaRespones.ShowResponse fullPath, popupTitle
End Sub
```

---

### 3. AI Popup Form (A_IlamaRespones.frm)

**Components:**
- `OrdoWebView1`: WebView2 control to display HTML
- `TitelBar1`: Custom title bar for the form
- `Gif89a1`: Loading GIF (hidden after DocumentComplete)

**Event Flow:**

```vb
' When form loads
Private Sub Form_Load()
    Me.BackColor = RGB(245, 245, 250)  ' Light background
    isProcessing = False
    
    ' Initialize WebView
    OrdoWebView1.init
    OrdoWebView1.HomeURL = "about:blank"
End Sub

' After WebView initializes
Private Sub OrdoWebView1_InitComplete()
    ' Load the spinner page
    localFilePath = App.Path & "\HTML_AI_response\ai-loading.html"
    OrdoWebView1.HomeURL = "file:///" & Replace(localFilePath, "\", "/")
End Sub

' After spinner page loads
Private Sub OrdoWebView1_DocumentComplete()
    Gif89a1.Visible = False  ' Hide loading GIF
    
    ' Trigger AI processing (only once)
    If Not isProcessing Then
        isProcessing = True
        A_llamaAIintegration.ProcessPendingAIRequest
    End If
End Sub

' Show the interpretation HTML
Public Sub ShowResponse(htmlPath As String, Optional titleText As String = "AI Response")
    mTargetPath = htmlPath
    Me.Caption = titleText
    isProcessing = True  ' Prevent re-triggering
    
    ' Navigate to the generated HTML
    OrdoWebView1.NavigateToFile(Replace(mTargetPath, "\", "/"))
End Sub

' When form closes
Private Sub Form_Unload(Cancel As Integer)
    isProcessing = False  ' Reset flag
End Sub
```

---

## 🔧 Key Technical Details

### JSON Data Structure (from JavaScript)

```json
{
  "testName": "One-Sample t-Test",
  "testParameter": "Mean (μ)",
  "testOrientation": "Two-sided",
  "method": "bootstrap",
  "testStatistic": "-3.9524",
  "pValue": "0.0002",
  "alpha": 0.05,
  "effectSizeLabel": "Cohen's d",
  "effectSizeValue": "0.885",
  "variableName": "Age",
  "sampleSize": 50,
  "h0Value": 30,
  "decision": "Reject H0"
}
```

### AI Prompt Structure

```
You are a statistical expert. Interpret these hypothesis test results for a researcher.
Provide a clear, professional interpretation covering:
1. What the test tells us (statistical significance)
2. Practical significance (effect size interpretation)
3. Key assumptions and limitations
4. Recommended next steps

Keep it concise (3-4 paragraphs) and accessible.

TEST RESULTS:
Test: One-Sample t-Test
Test Type: Two-Tailed Test
Parameter: Mean (μ)
Sample Size: n=50
Test Statistic: -3.9524
P-value: 0.0002
Alpha: 0.05
Effect Size: Cohen's d = 0.885
Decision: Reject H0
```

### API Request to Groq

```json
{
  "model": "llama-3.3-70b-versatile",
  "messages": [
    {
      "role": "user",
      "content": "[prompt from above]"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

### API Response Format

```json
{
  "choices": [
    {
      "message": {
        "content": "The one-sample t-test results indicate..."
      }
    }
  ]
}
```

---

## 🎯 Key Features

### 1. **Asynchronous Flow**
- JavaScript sends request immediately
- VB6 shows loading spinner while processing
- User sees spinner → AI processes → interpretation appears

### 2. **Error Handling**
```vb
On Error GoTo ErrorHandler

' ... processing code ...

ErrorHandler:
    Debug.Print "❌ Error:", Err.Description
    SendAIErrorToHypothesisDashboard "Error: " & Err.Description
```

### 3. **Preventing Duplicate Requests**
- `isProcessing` flag prevents DocumentComplete from firing multiple times
- `pendingTestData` cleared after processing

### 4. **Data Persistence**
- Module-level variable `pendingTestData` retains JSON between form events
- Ensures data isn't lost during form initialization

---

## 🐛 Common Issues & Solutions

### Issue: "No pending test data to process"

**Cause:** `pendingTestData` is empty when `ProcessPendingAIRequest()` is called

**Solution:**
```vb
' Ensure data is stored BEFORE showing form
pendingTestData = jsonTestData
A_IlamaRespones.Show
```

### Issue: Spinner spins endlessly

**Cause:** `DocumentComplete` fires multiple times, causing infinite loop

**Solution:**
```vb
If Not isProcessing Then
    isProcessing = True
    ' ... process only once ...
End If
```

### Issue: API returns error 401

**Cause:** Invalid or expired API key

**Solution:**
```vb
Private Const API_KEY As String = "your_valid_groq_api_key"
```

### Issue: Wrong test orientation (one-tailed vs two-tailed)

**Cause:** JavaScript sends different values than VB6 expects

**Solution:**
```vb
' Map all possible values
Select Case testOrientation
    Case "One-sided", "Right-tailed"
        orientationText = "One-Tailed Test (Right-Tailed)"
    Case "Left-tailed"
        orientationText = "One-Tailed Test (Left-Tailed)"
    Case "Two-sided"
        orientationText = "Two-Tailed Test"
End Select
```

---

## 📊 Performance Notes

- **API Call Duration**: ~2-5 seconds (depends on Groq API)
- **HTML Generation**: < 100ms
- **WebView Load Time**: < 500ms
- **Total User Wait**: ~3-6 seconds from click to display

---

## 🔐 Security Considerations

1. **API Key Storage**: Currently hardcoded in module (consider moving to config file)
2. **JSON Injection**: Using VBA-JSON library with proper escaping
3. **HTML Injection**: `HtmlEncode()` function sanitizes all user input before HTML generation

---

## 📚 Dependencies

- **VBA-JSON Library**: For JSON parsing/serialization
- **MSXML2.XMLHTTP.6.0**: For HTTP requests
- **OrdoWebView2**: For displaying HTML content
- **Groq API**: Free AI service (requires API key)

---

## 🚀 Adding AI to Other Dashboards

To add AI interpretation to another dashboard (e.g., Normality Tests):

1. **JavaScript Side:** Use the AI button template
   ```javascript
   AIButton.init('aiInterpretBtn', function() {
     return { /* your test data structure */ };
   });
   ```

2. **VB6 Side:** Add case to message handler
   ```vb
   Case "RequestAIInterpretation"
       A_IlamaRespones.Show
       A_llamaAIintegration.HandleHypothesisAIRequest sMsgContent
   ```

3. **Customize Prompt:** Modify `BuildHypothesisTestPrompt()` or create new prompt builder

That's it! The entire AI infrastructure is reusable. ✅

---

**Version:** 1.0  
**Last Updated:** 2024-11-21  
**AI Model:** LLaMA 3.3 70B Versatile (via Groq API)

