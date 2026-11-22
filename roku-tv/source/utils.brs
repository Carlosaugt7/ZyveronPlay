' ===================================================
' ZYVERON PLAY - UTILITÁRIOS E HELPERS
' ===================================================

Function SafeString(val as Dynamic, fallback = "" as String) as String
    if val = invalid return fallback
    if type(val) = "roString" or type(val) = "String" return val
    if type(val) = "roInt" or type(val) = "Integer" return StrI(val).Trim()
    if type(val) = "roFloat" or type(val) = "Float" return Str(val).Trim()
    return fallback
End Function

Function NormalizeUrl(url as String) as String
    clean = url.Trim()
    if clean = "" return ""
    
    if Left(clean, 7) <> "http://" and Left(clean, 8) <> "https://"
        clean = "http://" + clean
    end if
    
    ' Remove barras finais
    while Right(clean, 1) = "/"
        clean = Left(clean, Len(clean) - 1)
    end while
    
    return clean
End Function

Function FormatExpirationDate(rawDate as String) as String
    if rawDate = invalid or rawDate.Trim() = ""
        return "Ilimitado"
    end if
    clean = rawDate.Trim()
    ' Se vier em ISO 8601 (YYYY-MM-DD)
    if Len(clean) >= 10 and Mid(clean, 5, 1) = "-"
        year = Mid(clean, 1, 4)
        month = Mid(clean, 6, 2)
        day = Mid(clean, 9, 2)
        return day + "/" + month + "/" + year
    end if
    return clean
End Function
