' ===================================================
' ZYVERON PLAY - CONTROLLER DA HOME
' ===================================================

Sub init()
    m.lblServerName = m.top.findNode("lblServerName")
    m.lblExpiration = m.top.findNode("lblExpiration")
    
    m.cards = [
        { bg: m.top.findNode("bgLive"), border: m.top.findNode("borderLive"), target: "LiveTvView" },
        { bg: m.top.findNode("bgMovies"), border: m.top.findNode("borderMovies"), target: "VodView", type: "movies" },
        { bg: m.top.findNode("bgSeries"), border: m.top.findNode("borderSeries"), target: "VodView", type: "series" },
        { bg: m.top.findNode("bgExit"), border: m.top.findNode("borderExit"), target: "exit" }
    ]
    
    m.focusedIndex = 0
    UpdateFocus()
End Sub

Sub OnAccountDataChange()
    data = m.top.accountData
    if data <> invalid
        if data.serverName <> invalid and data.serverName <> ""
            m.lblServerName.text = "Servidor: " + data.serverName
        end if
        if data.expirationDate <> invalid
            m.lblExpiration.text = "Validade: " + FormatExpirationDate(data.expirationDate)
        end if
    end if
End Sub

Sub UpdateFocus()
    for i = 0 to m.cards.Count() - 1
        item = m.cards[i]
        if i = m.focusedIndex
            item.border.visible = true
            item.bg.color = "#1e293b"
        else
            item.border.visible = false
            item.bg.color = "#121826"
        end if
    end for
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press return false
    
    if key = "right"
        if m.focusedIndex < m.cards.Count() - 1
            m.focusedIndex = m.focusedIndex + 1
            UpdateFocus()
            return true
        end if
    else if key = "left"
        if m.focusedIndex > 0
            m.focusedIndex = m.focusedIndex - 1
            UpdateFocus()
            return true
        end if
    else if key = "OK"
        selected = m.cards[m.focusedIndex]
        scene = m.top.getScene()
        if scene <> invalid
            if selected.target = "exit"
                scene.callFunc("ShowExitConfirmation", invalid)
            else if selected.target = "VodView"
                scene.callFunc("NavigateTo", "VodView", { mode: selected.type })
            else
                scene.callFunc("NavigateTo", selected.target, invalid)
            end if
        end if
        return true
    end if
    
    return false
End Function
