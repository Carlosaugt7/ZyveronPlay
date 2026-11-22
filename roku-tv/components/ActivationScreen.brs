' ===================================================
' ZYVERON PLAY - LOGICA DA TELA DE ATIVAÇÃO
' ===================================================

Sub init()
    m.lblDeviceId = m.top.findNode("lblDeviceId")
    m.lblActivationCode = m.top.findNode("lblActivationCode")
    m.lblStatus = m.top.findNode("lblStatus")
    m.btnGroup = m.top.findNode("btnGroup")
    
    m.btnGroup.buttons = ["Verificar Agora"]
    m.btnGroup.observeField("buttonSelected", "OnCheckPressed")
    
    m.btnGroup.setFocus(true)
End Sub

Sub OnViewParamsChange()
    params = m.top.viewParams
    if params <> invalid
        if params.deviceId <> invalid
            m.lblDeviceId.text = params.deviceId
        end if
        if params.activationCode <> invalid
            m.lblActivationCode.text = params.activationCode
        end if
        if params.message <> invalid and params.message <> ""
            m.lblStatus.text = params.message
        end if
    end if
End Sub

Sub OnStatusMessageChange()
    if m.top.statusMessage <> invalid and m.top.statusMessage <> ""
        m.lblStatus.text = m.top.statusMessage
    end if
End Sub

Sub OnCheckPressed()
    scene = m.top.getScene()
    if scene <> invalid
        m.lblStatus.text = "Consultando status no servidor..."
        scene.callFunc("CheckInitialStatus", invalid)
    end if
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press return false
    
    if key = "OK"
        OnCheckPressed()
        return true
    end if
    
    return false
End Function
