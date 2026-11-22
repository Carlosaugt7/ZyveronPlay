' ===================================================
' ZYVERON PLAY - CLIENTE API (FIRESTORE & XTREAM)
' ===================================================

Function MakeHttpGet(url as String, timeoutMs = 8000 as Integer) as Object
    transfer = CreateObject("roUrlTransfer")
    transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    transfer.InitClientCertificates()
    transfer.SetUrl(url)
    transfer.RetainBodyOnError(true)
    
    port = CreateObject("roMessagePort")
    transfer.SetPort(port)
    
    if transfer.AsyncGetToString()
        msg = wait(timeoutMs, port)
        if type(msg) = "roUrlEvent"
            code = msg.GetResponseCode()
            body = msg.GetString()
            if code >= 200 and code < 300
                return { success: true, body: body, code: code }
            else
                return { success: false, body: body, code: code, error: "HTTP " + StrI(code).Trim() }
            end if
        else
            transfer.AsyncCancel()
            return { success: false, error: "Timeout na conexão" }
        end if
    end if
    
    return { success: false, error: "Falha ao iniciar requisição" }
End Function

' Consulta o status de ativação no Firestore REST API
Function CheckDeviceActivation(deviceId as String) as Object
    cleanId = deviceId.Trim().UCase()
    url = "https://firestore.googleapis.com/v1/projects/zyveronplay/databases/(default)/documents/devices/" + cleanId
    
    res = MakeHttpGet(url, 6000)
    if not res.success
        if res.code = 404
            return { status: "unregistered", message: "Dispositivo não ativado no painel." }
        end if
        return { status: "error", message: "Erro de conexão com o servidor de ativação." }
    end if
    
    json = ParseJson(res.body)
    if json = invalid or json.fields = invalid
        return { status: "unregistered", message: "Dispositivo aguardando ativação." }
    end if
    
    fields = json.fields
    
    deviceStatus = "active"
    if fields.status <> invalid and fields.status.stringValue <> invalid
        deviceStatus = fields.status.stringValue
    end if
    
    if deviceStatus = "blocked"
        return { status: "blocked", message: "Dispositivo bloqueado pela administração." }
    end if
    
    username = ""
    if fields.username <> invalid and fields.username.stringValue <> invalid
        username = fields.username.stringValue.Trim()
    end if
    
    password = ""
    if fields.password <> invalid and fields.password.stringValue <> invalid
        password = fields.password.stringValue.Trim()
    end if
    
    serverDns = ""
    if fields.serverDns <> invalid and fields.serverDns.stringValue <> invalid
        serverDns = fields.serverDns.stringValue.Trim()
    else if fields.activeDns <> invalid and fields.activeDns.stringValue <> invalid
        serverDns = fields.activeDns.stringValue.Trim()
    else if fields.dns <> invalid and fields.dns.stringValue <> invalid
        serverDns = fields.dns.stringValue.Trim()
    end if
    
    serverName = "Lista Principal"
    if fields.serverName <> invalid and fields.serverName.stringValue <> invalid
        serverName = fields.serverName.stringValue.Trim()
    end if
    
    serverId = ""
    if fields.serverId <> invalid and fields.serverId.stringValue <> invalid
        serverId = fields.serverId.stringValue.Trim()
    end if
    
    expirationDate = ""
    if fields.expirationDate <> invalid and fields.expirationDate.stringValue <> invalid
        expirationDate = fields.expirationDate.stringValue.Trim()
    end if
    
    ' Se tiver serverId e o DNS estiver vazio, busca da coleção servers
    if serverId <> "" and serverDns = ""
        serverUrl = "https://firestore.googleapis.com/v1/projects/zyveronplay/databases/(default)/documents/servers/" + serverId
        sRes = MakeHttpGet(serverUrl, 4000)
        if sRes.success
            sJson = ParseJson(sRes.body)
            if sJson <> invalid and sJson.fields <> invalid
                if sJson.fields.name <> invalid and sJson.fields.name.stringValue <> invalid
                    serverName = sJson.fields.name.stringValue.Trim()
                end if
                if sJson.fields.activeDns <> invalid and sJson.fields.activeDns.stringValue <> invalid
                    serverDns = sJson.fields.activeDns.stringValue.Trim()
                else if sJson.fields.serverDns <> invalid and sJson.fields.serverDns.stringValue <> invalid
                    serverDns = sJson.fields.serverDns.stringValue.Trim()
                end if
            end if
        end if
    end if
    
    if username = "" or password = "" or serverDns = ""
        return { status: "unregistered", message: "Conta IPTV ainda não configurada no dispositivo." }
    end if
    
    return {
        status: "active",
        username: username,
        password: password,
        serverDns: NormalizeUrl(serverDns),
        serverName: serverName,
        expirationDate: expirationDate
    }
End Function

' Carrega as categorias de canais ao vivo
Function FetchLiveCategories(dns as String, username as String, password as String) as Object
    url = dns + "/player_api.php?username=" + username + "&password=" + password + "&action=get_live_categories"
    res = MakeHttpGet(url, 7000)
    if res.success
        list = ParseJson(res.body)
        if list <> invalid and type(list) = "roArray"
            return list
        end if
    end if
    return []
End Function

' Carrega os canais ao vivo de uma categoria
Function FetchLiveStreams(dns as String, username as String, password as String, categoryId as String) as Object
    url = dns + "/player_api.php?username=" + username + "&password=" + password + "&action=get_live_streams"
    if categoryId <> "" and categoryId <> "all"
        url = url + "&category_id=" + categoryId
    end if
    res = MakeHttpGet(url, 10000)
    if res.success
        list = ParseJson(res.body)
        if list <> invalid and type(list) = "roArray"
            return list
        end if
    end if
    return []
End Function

' Carrega categorias de filmes (VOD)
Function FetchVodCategories(dns as String, username as String, password as String) as Object
    url = dns + "/player_api.php?username=" + username + "&password=" + password + "&action=get_vod_categories"
    res = MakeHttpGet(url, 7000)
    if res.success
        list = ParseJson(res.body)
        if list <> invalid and type(list) = "roArray"
            return list
        end if
    end if
    return []
End Function

' Carrega filmes de uma categoria
Function FetchVodStreams(dns as String, username as String, password as String, categoryId as String) as Object
    url = dns + "/player_api.php?username=" + username + "&password=" + password + "&action=get_vod_streams"
    if categoryId <> "" and categoryId <> "all"
        url = url + "&category_id=" + categoryId
    end if
    res = MakeHttpGet(url, 10000)
    if res.success
        list = ParseJson(res.body)
        if list <> invalid and type(list) = "roArray"
            return list
        end if
    end if
    return []
End Function

' Carrega categorias de séries
Function FetchSeriesCategories(dns as String, username as String, password as String) as Object
    url = dns + "/player_api.php?username=" + username + "&password=" + password + "&action=get_series_categories"
    res = MakeHttpGet(url, 7000)
    if res.success
        list = ParseJson(res.body)
        if list <> invalid and type(list) = "roArray"
            return list
        end if
    end if
    return []
End Function

' Carrega séries de uma categoria
Function FetchSeriesStreams(dns as String, username as String, password as String, categoryId as String) as Object
    url = dns + "/player_api.php?username=" + username + "&password=" + password + "&action=get_series"
    if categoryId <> "" and categoryId <> "all"
        url = url + "&category_id=" + categoryId
    end if
    res = MakeHttpGet(url, 10000)
    if res.success
        list = ParseJson(res.body)
        if list <> invalid and type(list) = "roArray"
            return list
        end if
    end if
    return []
End Function
