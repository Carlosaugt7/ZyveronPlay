' ===================================================
' ZYVERON PLAY - REGISTRY & PERSISTÊNCIA LOCAL
' ===================================================

Function GetRegistryValue(key as String, defaultValue = "" as String) as String
    sec = CreateObject("roRegistrySection", "ZyveronPlay")
    if sec.Exists(key)
        return sec.Read(key)
    end if
    return defaultValue
End Function

Sub SetRegistryValue(key as String, value as String)
    sec = CreateObject("roRegistrySection", "ZyveronPlay")
    sec.Write(key, value)
    sec.Flush()
End Sub

Sub DeleteRegistryValue(key as String)
    sec = CreateObject("roRegistrySection", "ZyveronPlay")
    if sec.Exists(key)
        sec.Delete(key)
        sec.Flush()
    end if
End Sub
