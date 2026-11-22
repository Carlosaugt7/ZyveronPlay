' ===================================================
' ZYVERON PLAY - ROKU ENTRY POINT
' ===================================================

Sub RunUserInterface(args as Dynamic)
    screen = CreateObject("roSGScreen")
    m.port = CreateObject("roMessagePort")
    screen.SetMessagePort(m.port)
    
    scene = screen.CreateScene("MainScene")
    screen.Show()
    
    ' Passa argumentos de inicialização (Deep Linking se houver)
    if args <> invalid and type(args) = "roAssociativeArray"
        scene.launchArgs = args
    end if
    
    while(true)
        msg = wait(0, m.port)
        msgType = type(msg)
        if msgType = "roSGScreenEvent"
            if msg.isScreenClosed()
                return
            end if
        end if
    end while
End Sub
