' COMPLETE OPTIMIZED QQ & PP DATA BUILDER
' This is a complete drop-in replacement for your slow string concatenation code
' Handles both QQ and PP data with massive performance improvements

Public Function BuildJsonWithConverterOptimized() As String
    Dim i As Long, arrayIndex As Long
    Dim jsonStr As String
    Dim qqStr As String, ppStr As String
    Dim qqDetrendedStr As String, ppDetrendedStr As String
    
    ' ===== OPTIMIZED QQ DATA BUILDING =====
    ' Get QQ vector size for pre-allocation
    Dim qqVectorSize As Long
    qqVectorSize = UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1
    
    ' Pre-allocate QQ arrays with known size (MUCH faster than string concatenation)
    Dim qqArray() As String, qqDetrendedArray() As String
    ReDim qqArray(0 To qqVectorSize - 1)
    ReDim qqDetrendedArray(0 To qqVectorSize - 1)
    
    ' Build QQ data using arrays (eliminates O(n²) string concatenation)
    For i = LBound(QQ_X_vector) To UBound(QQ_X_vector)
        arrayIndex = i - LBound(QQ_X_vector)
        qqArray(arrayIndex) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
        qqDetrendedArray(arrayIndex) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
    Next i
    
    ' Join QQ arrays into final strings (single operation instead of thousands)
    qqStr = "[" & Join(qqArray, ",") & "]"
    qqDetrendedStr = "[" & Join(qqDetrendedArray, ",") & "]"
    
    ' ===== OPTIMIZED PP DATA BUILDING =====
    ' Get PP vector size for pre-allocation
    Dim ppVectorSize As Long
    ppVectorSize = UBound(PP_X_vector) - LBound(PP_X_vector) + 1
    
    ' Pre-allocate PP arrays with known size (MUCH faster than string concatenation)
    Dim ppArray() As String, ppDetrendedArray() As String
    ReDim ppArray(0 To ppVectorSize - 1)
    ReDim ppDetrendedArray(0 To ppVectorSize - 1)
    
    ' Build PP data using arrays (eliminates O(n²) string concatenation)
    For i = LBound(PP_X_vector) To UBound(PP_X_vector)
        arrayIndex = i - LBound(PP_X_vector)
        ppArray(arrayIndex) = "{""x"":" & PP_X_vector(i) & ",""y"":" & PP_Y_vector(i) & "}"
        ppDetrendedArray(arrayIndex) = "{""x"":" & PP_X_vector(i) & ",""y"":" & (PP_X_vector(i) - PP_Y_vector(i)) & "}"
    Next i
    
    ' Join PP arrays into final strings (single operation instead of thousands)
    ppStr = "[" & Join(ppArray, ",") & "]"
    ppDetrendedStr = "[" & Join(ppDetrendedArray, ",") & "]"
    
    ' ===== COMBINE INTO FINAL JSON =====
    jsonStr = "{""qqData"":" & qqStr & ",""ppData"":" & ppStr & ",""qqDetrendedData"":" & qqDetrendedStr & ",""ppDetrendedData"":" & ppDetrendedStr & "}"
    
    BuildJsonWithConverterOptimized = jsonStr
End Function

' ALTERNATIVE VERSION FOR EXTREMELY LARGE DATASETS (>50,000 records)
' Uses ArrayList for dynamic allocation and includes progress reporting
Public Function BuildJsonWithConverterLarge() As String
    Dim i As Long
    Dim jsonStr As String
    Dim qqStr As String, ppStr As String
    Dim qqDetrendedStr As String, ppDetrendedStr As String
    
    ' ===== OPTIMIZED QQ DATA BUILDING (Large Dataset Version) =====
    Dim qqList As Object, qqDetrendedList As Object
    Set qqList = CreateObject("System.Collections.ArrayList")
    Set qqDetrendedList = CreateObject("System.Collections.ArrayList")
    
    ' Show progress for large QQ datasets
    Dim qqTotalRecords As Long
    qqTotalRecords = UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1
    Debug.Print "Processing " & qqTotalRecords & " QQ records..."
    
    ' Build QQ data with progress reporting
    For i = LBound(QQ_X_vector) To UBound(QQ_X_vector)
        qqList.Add "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
        qqDetrendedList.Add "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
        
        ' Progress reporting every 10,000 records
        If (i - LBound(QQ_X_vector)) Mod 10000 = 0 Then
            Debug.Print "QQ: Processed " & (i - LBound(QQ_X_vector)) & " of " & qqTotalRecords & " records..."
        End If
    Next i
    
    ' Convert QQ to final strings
    qqStr = "[" & Join(qqList.ToArray(), ",") & "]"
    qqDetrendedStr = "[" & Join(qqDetrendedList.ToArray(), ",") & "]"
    
    ' Clean up QQ objects
    Set qqList = Nothing
    Set qqDetrendedList = Nothing
    
    ' ===== OPTIMIZED PP DATA BUILDING (Large Dataset Version) =====
    Dim ppList As Object, ppDetrendedList As Object
    Set ppList = CreateObject("System.Collections.ArrayList")
    Set ppDetrendedList = CreateObject("System.Collections.ArrayList")
    
    ' Show progress for large PP datasets
    Dim ppTotalRecords As Long
    ppTotalRecords = UBound(PP_X_vector) - LBound(PP_X_vector) + 1
    Debug.Print "Processing " & ppTotalRecords & " PP records..."
    
    ' Build PP data with progress reporting
    For i = LBound(PP_X_vector) To UBound(PP_X_vector)
        ppList.Add "{""x"":" & PP_X_vector(i) & ",""y"":" & PP_Y_vector(i) & "}"
        ppDetrendedList.Add "{""x"":" & PP_X_vector(i) & ",""y"":" & (PP_X_vector(i) - PP_Y_vector(i)) & "}"
        
        ' Progress reporting every 10,000 records
        If (i - LBound(PP_X_vector)) Mod 10000 = 0 Then
            Debug.Print "PP: Processed " & (i - LBound(PP_X_vector)) & " of " & ppTotalRecords & " records..."
        End If
    Next i
    
    ' Convert PP to final strings
    ppStr = "[" & Join(ppList.ToArray(), ",") & "]"
    ppDetrendedStr = "[" & Join(ppDetrendedList.ToArray(), ",") & "]"
    
    ' Clean up PP objects
    Set ppList = Nothing
    Set ppDetrendedList = Nothing
    
    ' ===== COMBINE INTO FINAL JSON =====
    jsonStr = "{""qqData"":" & qqStr & ",""ppData"":" & ppStr & ",""qqDetrendedData"":" & qqDetrendedStr & ",""ppDetrendedData"":" & ppDetrendedStr & "}"
    
    Debug.Print "Large dataset JSON built successfully. Total length: " & Len(jsonStr)
    BuildJsonWithConverterLarge = jsonStr
End Function

' BATCH PROCESSING VERSION FOR MASSIVE DATASETS (>100,000 records)
' Processes data in chunks to prevent memory issues
Public Function BuildJsonWithConverterBatched() As String
    Dim i As Long, batchSize As Long, batchStart As Long, batchEnd As Long
    Dim jsonStr As String
    Dim qqStr As String, ppStr As String
    Dim qqDetrendedStr As String, ppDetrendedStr As String
    
    batchSize = 5000 ' Process 5000 records at a time
    
    ' ===== BATCHED QQ DATA BUILDING =====
    Dim qqParts As Object, qqDetrendedParts As Object
    Set qqParts = CreateObject("System.Collections.ArrayList")
    Set qqDetrendedParts = CreateObject("System.Collections.ArrayList")
    
    Debug.Print "Building QQ data in batches of " & batchSize & " records..."
    
    For batchStart = LBound(QQ_X_vector) To UBound(QQ_X_vector) Step batchSize
        batchEnd = Application.Min(batchStart + batchSize - 1, UBound(QQ_X_vector))
        
        ' Process QQ batch
        Dim batchQQ() As String, batchQQDetrended() As String
        ReDim batchQQ(0 To batchEnd - batchStart)
        ReDim batchQQDetrended(0 To batchEnd - batchStart)
        
        For i = batchStart To batchEnd
            Dim idx As Long
            idx = i - batchStart
            batchQQ(idx) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
            batchQQDetrended(idx) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
        Next i
        
        ' Add batch to collections
        qqParts.Add Join(batchQQ, ",")
        qqDetrendedParts.Add Join(batchQQDetrended, ",")
        
        ' Show progress
        If (batchStart - LBound(QQ_X_vector)) Mod 25000 = 0 Then
            Debug.Print "QQ: Processed " & (batchStart - LBound(QQ_X_vector) + batchSize) & " records..."
        End If
    Next batchStart
    
    ' Combine QQ batches
    qqStr = "[" & Join(qqParts.ToArray(), ",") & "]"
    qqDetrendedStr = "[" & Join(qqDetrendedParts.ToArray(), ",") & "]"
    Set qqParts = Nothing
    Set qqDetrendedParts = Nothing
    
    ' ===== BATCHED PP DATA BUILDING =====
    Dim ppParts As Object, ppDetrendedParts As Object
    Set ppParts = CreateObject("System.Collections.ArrayList")
    Set ppDetrendedParts = CreateObject("System.Collections.ArrayList")
    
    Debug.Print "Building PP data in batches of " & batchSize & " records..."
    
    For batchStart = LBound(PP_X_vector) To UBound(PP_X_vector) Step batchSize
        batchEnd = Application.Min(batchStart + batchSize - 1, UBound(PP_X_vector))
        
        ' Process PP batch
        Dim batchPP() As String, batchPPDetrended() As String
        ReDim batchPP(0 To batchEnd - batchStart)
        ReDim batchPPDetrended(0 To batchEnd - batchStart)
        
        For i = batchStart To batchEnd
            idx = i - batchStart
            batchPP(idx) = "{""x"":" & PP_X_vector(i) & ",""y"":" & PP_Y_vector(i) & "}"
            batchPPDetrended(idx) = "{""x"":" & PP_X_vector(i) & ",""y"":" & (PP_X_vector(i) - PP_Y_vector(i)) & "}"
        Next i
        
        ' Add batch to collections
        ppParts.Add Join(batchPP, ",")
        ppDetrendedParts.Add Join(batchPPDetrended, ",")
        
        ' Show progress
        If (batchStart - LBound(PP_X_vector)) Mod 25000 = 0 Then
            Debug.Print "PP: Processed " & (batchStart - LBound(PP_X_vector) + batchSize) & " records..."
        End If
    Next batchStart
    
    ' Combine PP batches
    ppStr = "[" & Join(ppParts.ToArray(), ",") & "]"
    ppDetrendedStr = "[" & Join(ppDetrendedParts.ToArray(), ",") & "]"
    Set ppParts = Nothing
    Set ppDetrendedParts = Nothing
    
    ' ===== COMBINE INTO FINAL JSON =====
    jsonStr = "{""qqData"":" & qqStr & ",""ppData"":" & ppStr & ",""qqDetrendedData"":" & qqDetrendedStr & ",""ppDetrendedData"":" & ppDetrendedStr & "}"
    
    Debug.Print "Batched dataset JSON built successfully. Total length: " & Len(jsonStr)
    BuildJsonWithConverterBatched = jsonStr
End Function

' PERFORMANCE TESTING FUNCTION
Sub TestCompletePerformance()
    Dim startTime As Double, endTime As Double
    Dim result As String
    
    ' Test the optimized version
    Debug.Print "=== PERFORMANCE TEST ==="
    Debug.Print "QQ Records: " & (UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1)
    Debug.Print "PP Records: " & (UBound(PP_X_vector) - LBound(PP_X_vector) + 1)
    Debug.Print ""
    
    startTime = Timer
    result = BuildJsonWithConverterOptimized()
    endTime = Timer
    
    Debug.Print "Optimized complete function took: " & Format(endTime - startTime, "0.000") & " seconds"
    Debug.Print "Total records processed: " & ((UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1) + (UBound(PP_X_vector) - LBound(PP_X_vector) + 1))
    Debug.Print "Performance: " & Format(((UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1) + (UBound(PP_X_vector) - LBound(PP_X_vector) + 1)) / (endTime - startTime), "0") & " records/second"
    Debug.Print "JSON length: " & Len(result) & " characters"
End Sub

' ERROR-SAFE VERSION WITH VALIDATION
Public Function BuildJsonWithConverterSafe() As String
    On Error GoTo ErrorHandler
    
    Dim i As Long, arrayIndex As Long
    Dim jsonStr As String
    Dim qqStr As String, ppStr As String
    Dim qqDetrendedStr As String, ppDetrendedStr As String
    
    ' Validate QQ vectors exist and are arrays
    If Not IsArray(QQ_X_vector) Or Not IsArray(QQ_Y_vector) Then
        qqStr = "[]"
        qqDetrendedStr = "[]"
    Else
        ' Validate QQ vector bounds match
        If UBound(QQ_X_vector) <> UBound(QQ_Y_vector) Or LBound(QQ_X_vector) <> LBound(QQ_Y_vector) Then
            qqStr = "[]"
            qqDetrendedStr = "[]"
        Else
            ' Build QQ data safely
            Dim qqVectorSize As Long
            qqVectorSize = UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1
            
            If qqVectorSize > 0 Then
                Dim qqArray() As String, qqDetrendedArray() As String
                ReDim qqArray(0 To qqVectorSize - 1)
                ReDim qqDetrendedArray(0 To qqVectorSize - 1)
                
                For i = LBound(QQ_X_vector) To UBound(QQ_X_vector)
                    arrayIndex = i - LBound(QQ_X_vector)
                    qqArray(arrayIndex) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
                    qqDetrendedArray(arrayIndex) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
                Next i
                
                qqStr = "[" & Join(qqArray, ",") & "]"
                qqDetrendedStr = "[" & Join(qqDetrendedArray, ",") & "]"
            Else
                qqStr = "[]"
                qqDetrendedStr = "[]"
            End If
        End If
    End If
    
    ' Validate PP vectors exist and are arrays
    If Not IsArray(PP_X_vector) Or Not IsArray(PP_Y_vector) Then
        ppStr = "[]"
        ppDetrendedStr = "[]"
    Else
        ' Validate PP vector bounds match
        If UBound(PP_X_vector) <> UBound(PP_Y_vector) Or LBound(PP_X_vector) <> LBound(PP_Y_vector) Then
            ppStr = "[]"
            ppDetrendedStr = "[]"
        Else
            ' Build PP data safely
            Dim ppVectorSize As Long
            ppVectorSize = UBound(PP_X_vector) - LBound(PP_X_vector) + 1
            
            If ppVectorSize > 0 Then
                Dim ppArray() As String, ppDetrendedArray() As String
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
                ppStr = "[]"
                ppDetrendedStr = "[]"
            End If
        End If
    End If
    
    ' Build final JSON
    jsonStr = "{""qqData"":" & qqStr & ",""ppData"":" & ppStr & ",""qqDetrendedData"":" & qqDetrendedStr & ",""ppDetrendedData"":" & ppDetrendedStr & "}"
    BuildJsonWithConverterSafe = jsonStr
    Exit Function
    
ErrorHandler:
    ' Return empty JSON structure on any error
    BuildJsonWithConverterSafe = "{""qqData"":[],""ppData"":[],""qqDetrendedData"":[],""ppDetrendedData"":[]}"
End Function
