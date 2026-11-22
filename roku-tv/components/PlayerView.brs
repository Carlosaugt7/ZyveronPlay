' ===================================================
' ZYVERON PLAY - PLAYER DE VÍDEO ROKU
' ===================================================

Sub init()
    m.videoPlayer = m.top.findNode("videoPlayer")
    m.playerOverlay = m.top.findNode("playerOverlay")
    m.lblStreamTitle = m.top.findNode("lblStreamTitle")
    m.lblStreamStatus = m.top.findNode("lblStreamStatus")
    m.lblBuffering = m.top.findNode("lblBuffering")
    m.overlayTimer = m.top.findNode("overlayTimer")
    
    m.videoPlayer.observeField("state", "OnVideoStateChange")
    m.overlayTimer.observeField("fire", "OnOverlayTimerFire")
    
    m.videoPlayer.setFocus(true)
End Sub

Sub OnViewParamsChange()
    params = m.top.viewParams
    if params <> invalid and params.streamUrl <> invalid
        m.lblStreamTitle.text = params.title
        
        content = CreateObject("roSGNode", "ContentNode")
        content.url = params.streamUrl
        content.title = params.title
        
        if params.streamType = "live"
            content.streamFormat = "hls"
            content.live = true
        else
            content.streamFormat = "mp4"
            content.live = false
        end if
        
        m.videoPlayer.content = content
        m.videoPlayer.control = "play"
        
        m.playerOverlay.visible = true
        m.overlayTimer.control = "start"
    end if
End Sub

Sub OnVideoStateChange()
    state = m.videoPlayer.state
    if state = "buffering"
        m.lblBuffering.visible = true
        m.lblStreamStatus.text = "Carregando buffer..."
    else if state = "playing"
        m.lblBuffering.visible = false
        m.lblStreamStatus.text = "Em reprodução"
        m.overlayTimer.control = "start"
    else if state = "paused"
        m.lblBuffering.visible = false
        m.lblStreamStatus.text = "Pausado"
        m.playerOverlay.visible = true
        m.overlayTimer.control = "stop"
    else if state = "error"
        m.lblBuffering.visible = false
        m.lblStreamStatus.text = "Erro no fluxo: " + m.videoPlayer.errorMsg
        m.playerOverlay.visible = true
    end if
End Sub

Sub OnOverlayTimerFire()
    if m.videoPlayer.state = "playing"
        m.playerOverlay.visible = false
    end if
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press return false
    
    if key = "play" or key = "OK"
        if m.videoPlayer.state = "playing"
            m.videoPlayer.control = "pause"
        else if m.videoPlayer.state = "paused"
            m.videoPlayer.control = "resume"
        end if
        return true
    else if key = "info" or key = "options" or key = "down" or key = "up"
        m.playerOverlay.visible = true
        m.overlayTimer.control = "start"
        return true
    else if key = "back"
        ' Para o vídeo antes de sair
        m.videoPlayer.control = "stop"
        return false ' Deixa o MainScene tratar o retorno de tela
    end if
    
    return false
End Function
