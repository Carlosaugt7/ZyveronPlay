' ===================================================
' ZYVERON PLAY - IDENTIFICAÇÃO DE DISPOSITIVO ROKU
' ===================================================

Function GetRokuDeviceId() as String
    devInfo = CreateObject("roDeviceInfo")
    rawId = ""
    
    if devInfo.DoesExist("GetChannelClientId")
        rawId = devInfo.GetChannelClientId()
    end if
    
    if rawId = invalid or rawId = ""
        ' Fallback para serial/modelo se necessário
        if devInfo.DoesExist("GetModel") and devInfo.DoesExist("GetCountryCode")
            rawId = devInfo.GetModel() + "_" + devInfo.GetCountryCode()
        else
            rawId = "ROKU99283746"
        end if
    end if
    
    ' Formata como chave de 12 caracteres hexadecimais legíveis
    reg = CreateObject("roRegex", "[^A-Za-z0-9]", "i")
    clean = UCase(reg.ReplaceAll(rawId, ""))
    if Len(clean) < 12
        clean = clean + "ZYVERONPLAYROKU"
    end if
    clean = Left(clean, 12)
    
    ' Gera formato padrão compatível com ativação MAC (ex: ROKU:2A:4F:9C:01:88:B3)
    formatted = "ROKU:" + Mid(clean, 1, 2) + ":" + Mid(clean, 3, 2) + ":" + Mid(clean, 5, 2) + ":" + Mid(clean, 7, 2) + ":" + Mid(clean, 9, 2) + ":" + Mid(clean, 11, 2)
    return formatted
End Function

Function GetRokuActivationCode(deviceId as String) as String
    reg = CreateObject("roRegex", "[^A-Za-z0-9]", "i")
    clean = reg.ReplaceAll(deviceId, "")
    code = Right(clean, 6)
    if Len(code) < 6
        code = "839201"
    end if
    return code
End Function
