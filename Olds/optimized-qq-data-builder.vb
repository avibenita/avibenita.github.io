' Optimized QQ Data Builder
' This version uses arrays instead of string concatenation for much better performance

Sub BuildQQDataOptimized()
    Dim i As Long
    Dim qqArray() As String
    Dim qqDetrendedArray() As String
    
    ' Get the size of the vectors
    Dim vectorSize As Long
    vectorSize = UBound(QQ_X_vector) - LBound(QQ_X_vector) + 1
    
    ' Pre-allocate arrays with known size
    ReDim qqArray(0 To vectorSize - 1)
    ReDim qqDetrendedArray(0 To vectorSize - 1)
    
    ' Build QQ data using arrays (much faster than string concatenation)
    For i = LBound(QQ_X_vector) To UBound(QQ_X_vector)
        Dim arrayIndex As Long
        arrayIndex = i - LBound(QQ_X_vector)
        
        ' Build JSON objects for each point
        qqArray(arrayIndex) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
        qqDetrendedArray(arrayIndex) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
    Next i
    
    ' Join arrays into final strings (single operation instead of many concatenations)
    Dim qqStr As String
    Dim qqDetrendedStr As String
    qqStr = "[" & Join(qqArray, ",") & "]"
    qqDetrendedStr = "[" & Join(qqDetrendedArray, ",") & "]"
    
    ' Use the resulting strings as needed
    Debug.Print "QQ Data: " & qqStr
    Debug.Print "QQ Detrended Data: " & qqDetrendedStr
End Sub

' Alternative version using StringBuilder-like approach for even better performance
' with very large datasets (requires reference to Microsoft Scripting Runtime)
Sub BuildQQDataWithStringBuilder()
    Dim i As Long
    Dim qqList As Object
    Dim qqDetrendedList As Object
    
    ' Create ArrayList objects for dynamic string building
    Set qqList = CreateObject("System.Collections.ArrayList")
    Set qqDetrendedList = CreateObject("System.Collections.ArrayList")
    
    ' Build QQ data using ArrayList (dynamic and efficient)
    For i = LBound(QQ_X_vector) To UBound(QQ_X_vector)
        qqList.Add "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
        qqDetrendedList.Add "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
    Next i
    
    ' Convert to final JSON arrays
    Dim qqStr As String
    Dim qqDetrendedStr As String
    qqStr = "[" & Join(qqList.ToArray(), ",") & "]"
    qqDetrendedStr = "[" & Join(qqDetrendedList.ToArray(), ",") & "]"
    
    ' Clean up objects
    Set qqList = Nothing
    Set qqDetrendedList = Nothing
    
    ' Use the resulting strings as needed
    Debug.Print "QQ Data: " & qqStr
    Debug.Print "QQ Detrended Data: " & qqDetrendedStr
End Sub

' Batch processing version for extremely large datasets
Sub BuildQQDataInBatches()
    Dim i As Long, batchSize As Long, batchStart As Long, batchEnd As Long
    Dim qqParts As Object, qqDetrendedParts As Object
    
    batchSize = 1000 ' Process 1000 records at a time
    Set qqParts = CreateObject("System.Collections.ArrayList")
    Set qqDetrendedParts = CreateObject("System.Collections.ArrayList")
    
    For batchStart = LBound(QQ_X_vector) To UBound(QQ_X_vector) Step batchSize
        batchEnd = Application.Min(batchStart + batchSize - 1, UBound(QQ_X_vector))
        
        ' Process batch
        Dim batchQQ() As String, batchDetended() As String
        ReDim batchQQ(0 To batchEnd - batchStart)
        ReDim batchDetended(0 To batchEnd - batchStart)
        
        For i = batchStart To batchEnd
            Dim idx As Long
            idx = i - batchStart
            batchQQ(idx) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & QQ_Y_vector(i) & "}"
            batchDetended(idx) = "{""x"":" & QQ_X_vector(i) & ",""y"":" & (QQ_X_vector(i) - QQ_Y_vector(i)) & "}"
        Next i
        
        ' Add batch to collections
        qqParts.Add Join(batchQQ, ",")
        qqDetrendedParts.Add Join(batchDetended, ",")
        
        ' Optional: Show progress for very large datasets
        If (batchStart - LBound(QQ_X_vector)) Mod 10000 = 0 Then
            Debug.Print "Processed " & (batchStart - LBound(QQ_X_vector) + batchSize) & " records..."
        End If
    Next batchStart
    
    ' Combine all batches
    Dim qqStr As String, qqDetrendedStr As String
    qqStr = "[" & Join(qqParts.ToArray(), ",") & "]"
    qqDetrendedStr = "[" & Join(qqDetrendedParts.ToArray(), ",") & "]"
    
    ' Clean up
    Set qqParts = Nothing
    Set qqDetrendedParts = Nothing
    
    Debug.Print "Final QQ data built successfully"
End Sub
