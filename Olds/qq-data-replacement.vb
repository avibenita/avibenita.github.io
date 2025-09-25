' OPTIMIZED QQ DATA BUILDER - DROP-IN REPLACEMENT
' Replace your existing slow QQ data building code with this optimized version
' This will dramatically improve performance for large datasets

' ORIGINAL SLOW CODE (for reference):
' qqStr = "["
' qqDetrendedStr = "["
' For i = LBound(QQ_X_vector) To UBound(QQ_X_vector)
'     If i > LBound(QQ_X_vector) Then
'         qqStr = qqStr & ","
'         qqDetrendedStr = qqDetrendedStr & ","
'     End If
'     qqStr = qqStr & "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
'     qqDetrendedStr = qqDetrendedStr & "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
' Next i
' qqStr = qqStr & "]"
' qqDetrendedStr = qqDetrendedStr & "]"

' REPLACE THE ABOVE WITH THIS OPTIMIZED VERSION:

Sub BuildOptimizedQQData()
    ' Declare variables
    Dim qqStr As String, ppStr As String
    Dim qqDetrendedStr As String, ppDetrendedStr As String
    Dim jsonStr As String
    
    ' Get vector size for pre-allocation
    Dim vectorSize As Long
    vectorSize = UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1
    
    ' Pre-allocate arrays for QQ data
    Dim qqArray() As String
    Dim qqDetrendedArray() As String
    ReDim qqArray(0 To vectorSize - 1)
    ReDim qqDetrendedArray(0 To vectorSize - 1)
    
    ' Build QQ data using arrays (MUCH faster than string concatenation)
    Dim i As Long, arrayIndex As Long
    For i = LBound(QQ_X_vector) To UBound(QQ_X_vector)
        arrayIndex = i - LBound(QQ_X_vector)
        qqArray(arrayIndex) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
        qqDetrendedArray(arrayIndex) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
    Next i
    
    ' Join arrays into final strings (single operation)
    qqStr = "[" & Join(qqArray, ",") & "]"
    qqDetrendedStr = "[" & Join(qqDetrendedArray, ",") & "]"
    
    ' Build PP data (assuming similar optimization needed)
    ' If you have PP_X_vector and PP_Y_vector, apply same optimization:
    If IsArray(PP_X_vector) And IsArray(PP_Y_vector) Then
        Dim ppVectorSize As Long
        ppVectorSize = UBound(PP_X_vector) - LBound(PP_X_vector) + 1
        
        Dim ppArray() As String
        Dim ppDetrendedArray() As String
        ReDim ppArray(0 To ppVectorSize - 1)
        ReDim ppDetrendedArray(0 To ppVectorSize - 1)
        
        For i = LBound(PP_X_vector) To UBound(PP_X_vector)
            arrayIndex = i - LBound(PP_X_vector)
            ppArray(arrayIndex) = "{""x"":" & PP_X_vector(i) & ",""y"":" & PP_Y_vector(i) & "}"
            ppDetrendedArray(arrayIndex) = "{""x"":" & PP_X_vector(i) & ",""y"":" & (PP_X_vector(i) - PP_Y_vector(i)) & "}"
        Next i
        
        ppStr = "[" & Join(ppArray, ",") & "]"
        ppDetrendedStr = "[" & Join(ppDetrendedArray, ",") & "]"
    Else
        ' Fallback if PP vectors don't exist
        ppStr = "[]"
        ppDetrendedStr = "[]"
    End If
    
    ' Build final JSON string
    jsonStr = "{""qqData"":" & qqStr & ",""ppData"":" & ppStr & ",""qqDetrendedData"":" & qqDetrendedStr & ",""ppDetrendedData"":" & ppDetrendedStr & "}"
    
    ' Use jsonStr as needed in your application
    Debug.Print "Optimized QQ data built successfully. Length: " & Len(jsonStr)
End Sub

' ALTERNATIVE VERSION FOR EXTREMELY LARGE DATASETS (>50,000 records)
Sub BuildOptimizedQQDataLarge()
    Dim qqStr As String, ppStr As String
    Dim qqDetrendedStr As String, ppDetrendedStr As String
    Dim jsonStr As String
    
    ' Use ArrayList for very large datasets
    Dim qqList As Object, qqDetrendedList As Object
    Set qqList = CreateObject("System.Collections.ArrayList")
    Set qqDetrendedList = CreateObject("System.Collections.ArrayList")
    
    ' Show progress for large datasets
    Dim totalRecords As Long
    totalRecords = UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1
    Debug.Print "Processing " & totalRecords & " QQ records..."
    
    ' Build QQ data with progress reporting
    Dim i As Long
    For i = LBound(QQ_X_vector) To UBound(QQ_X_vector)
        qqList.Add "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
        qqDetrendedList.Add "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
        
        ' Progress reporting every 10,000 records
        If (i - LBound(QQ_X_vector)) Mod 10000 = 0 Then
            Debug.Print "Processed " & (i - LBound(QQ_X_vector)) & " of " & totalRecords & " records..."
        End If
    Next i
    
    ' Convert to final strings
    qqStr = "[" & Join(qqList.ToArray(), ",") & "]"
    qqDetrendedStr = "[" & Join(qqDetrendedList.ToArray(), ",") & "]"
    
    ' Clean up objects
    Set qqList = Nothing
    Set qqDetrendedList = Nothing
    
    ' Handle PP data similarly if needed
    If IsArray(PP_X_vector) And IsArray(PP_Y_vector) Then
        Dim ppList As Object, ppDetrendedList As Object
        Set ppList = CreateObject("System.Collections.ArrayList")
        Set ppDetrendedList = CreateObject("System.Collections.ArrayList")
        
        For i = LBound(PP_X_vector) To UBound(PP_X_vector)
            ppList.Add "{""x"":" & PP_X_vector(i) & ",""y"":" & PP_Y_vector(i) & "}"
            ppDetrendedList.Add "{""x"":" & PP_X_vector(i) & ",""y"":" & (PP_X_vector(i) - PP_Y_vector(i)) & "}"
        Next i
        
        ppStr = "[" & Join(ppList.ToArray(), ",") & "]"
        ppDetrendedStr = "[" & Join(ppDetrendedList.ToArray(), ",") & "]"
        
        Set ppList = Nothing
        Set ppDetrendedList = Nothing
    Else
        ppStr = "[]"
        ppDetrendedStr = "[]"
    End If
    
    ' Build final JSON
    jsonStr = "{""qqData"":" & qqStr & ",""ppData"":" & ppStr & ",""qqDetrendedData"":" & qqDetrendedStr & ",""ppDetrendedData"":" & ppDetrendedStr & "}"
    
    Debug.Print "Large dataset QQ data built successfully. Length: " & Len(jsonStr)
End Sub

' PERFORMANCE TESTING FUNCTION
Sub TestQQPerformance()
    Dim startTime As Double, endTime As Double
    
    ' Test the optimized version
    startTime = Timer
    Call BuildOptimizedQQData
    endTime = Timer
    
    Debug.Print "Optimized QQ data building took: " & Format(endTime - startTime, "0.000") & " seconds"
    Debug.Print "Records processed: " & (UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1)
    Debug.Print "Performance: " & Format((UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1) / (endTime - startTime), "0") & " records/second"
End Sub
