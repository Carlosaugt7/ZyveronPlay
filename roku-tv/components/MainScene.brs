' ===================================================
' ZYVERON PLAY - CONTROLLER PRINCIPAL DA CENA
' ===================================================

Sub init()
    m.background = m.top.findNode("background")
    m.viewContainer = m.top.findNode("viewContainer")
    m.exitDialog = m.top.findNode("exitDialog")
    m.globalLoading = m.top.findNode("globalLoading")
    m.activationTimer = m.top.findNode("activationTimer")
    
    m.currentView = invalid
    m.currentViewName = ""
    m.viewHistory = []
    
    m.deviceId = GetRokuDeviceId()
    m.activationCode = GetRokuActivationCode(m.deviceId)
    
    ' Armazena credenciais ativas em memória
    m.account = invalid
    
    m.activationTimer.observeField("fire", "OnActivationTimerFire")
    
    ' Inicializa a verificação de status
    CheckInitialStatus()
End Sub

Sub CheckInitialStatus()
    m.globalLoading.visible = true
    
    ' Consulta status no Firestore
    devStatus = CheckDeviceActivation(m.deviceId)
    m.globalLoading.visible = false
    
    if devStatus.status = "active"
        m.account = devStatus
        m.activationTimer.control = "stop"
        NavigateTo("HomeView")
    else
        ' Mostra tela de ativação
        m.activationTimer.control = "start"
        NavigateTo("ActivationScreen", { deviceId: m.deviceId, activationCode: m.activationCode, status: devStatus.status, message: devStatus.message })
    end if
End Sub

Sub OnActivationTimerFire()
    if m.currentViewName = "ActivationScreen"
        devStatus = CheckDeviceActivation(m.deviceId)
        if devStatus.status = "active"
            m.account = devStatus
            m.activationTimer.control = "stop"
            NavigateTo("HomeView")
        else if m.currentView <> invalid
            m.currentView.statusMessage = devStatus.message
        end if
    end if
End Sub

Sub NavigateTo(viewName as String, params = invalid as Object)
    ' Remove view atual se houver
    if m.currentView <> invalid
        m.viewContainer.removeChild(m.currentView)
        m.currentView = invalid
    end if
    
    newView = CreateObject("roSGNode", viewName)
    if newView <> invalid
        newView.id = "activeView"
        
        ' Passa dados globais da conta e parâmetros
        if m.account <> invalid
            newView.accountData = m.account
        end if
        if params <> invalid
            newView.viewParams = params
        end if
        
        m.viewContainer.appendChild(newView)
        m.currentView = newView
        m.currentViewName = viewName
        
        ' Foco no novo componente
        m.currentView.setFocus(true)
    end if
End Sub

Sub ShowExitConfirmation()
    if m.exitDialog <> invalid
        m.exitDialog.visible = true
        m.exitDialog.setFocus(true)
    end if
End Sub

Sub HideExitConfirmation()
    if m.exitDialog <> invalid
        m.exitDialog.visible = false
        if m.currentView <> invalid
            m.currentView.setFocus(true)
        end if
    end if
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press return false
    
    ' Se modal de saída estiver aberto
    if m.exitDialog <> invalid and m.exitDialog.visible
        if key = "back"
            HideExitConfirmation()
            return true
        end if
        return false
    end if
    
    ' Se estiver na tela principal ou de ativação e pressionar Back
    if key = "back"
        if m.currentViewName = "HomeView" or m.currentViewName = "ActivationScreen"
            ShowExitConfirmation()
            return true
        else if m.currentViewName = "LiveTvView" or m.currentViewName = "VodView"
            NavigateTo("HomeView")
            return true
        else if m.currentViewName = "PlayerView"
            ' Retorna para a view de origem
            if m.previousViewName <> invalid and m.previousViewName <> ""
                NavigateTo(m.previousViewName)
            else
                NavigateTo("HomeView")
            end if
            return true
        end if
    end if
    
    return false
End Function
