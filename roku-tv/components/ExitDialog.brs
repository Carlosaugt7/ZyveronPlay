' ===================================================
' ZYVERON PLAY - DIÁLOGO DE SAÍDA
' ===================================================

Sub init()
    m.actionButtons = m.top.findNode("actionButtons")
    m.actionButtons.buttons = ["Sim, Sair", "Cancelar"]
    m.actionButtons.observeField("buttonSelected", "OnButtonSelected")
    m.top.observeField("visible", "OnVisibleChange")
End Sub

Sub OnVisibleChange()
    if m.top.visible
        m.actionButtons.setFocus(true)
    end if
End Sub

Sub OnButtonSelected()
    idx = m.actionButtons.buttonSelected
    if idx = 0
        ' Usuário escolheu sair do app
        scene = m.top.getScene()
        if scene <> invalid
            scene.close = true
        end if
    else
        ' Usuário cancelou
        scene = m.top.getScene()
        if scene <> invalid
            scene.callFunc("HideExitConfirmation", invalid)
        end if
    end if
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press return false
    
    if key = "back"
        scene = m.top.getScene()
        if scene <> invalid
            scene.callFunc("HideExitConfirmation", invalid)
        end if
        return true
    end if
    
    return false
End Function
