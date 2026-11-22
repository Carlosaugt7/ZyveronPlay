' ===================================================
' ZYVERON PLAY - CONTROLLER DE CANAIS AO VIVO
' ===================================================

Sub init()
    m.categoryList = m.top.findNode("categoryList")
    m.channelList = m.top.findNode("channelList")
    m.lblCategoryTitle = m.top.findNode("lblCategoryTitle")
    m.lblLoading = m.top.findNode("lblLoading")
    
    m.categories = []
    m.channels = []
    m.currentFocus = "categories"
    
    m.categoryList.observeField("itemFocused", "OnCategoryFocused")
    m.channelList.observeField("itemSelected", "OnChannelSelected")
End Sub

Sub OnAccountDataChange()
    LoadCategories()
End Sub

Sub LoadCategories()
    acc = m.top.accountData
    if acc = invalid return
    
    m.lblLoading.visible = true
    cats = FetchLiveCategories(acc.serverDns, acc.username, acc.password)
    m.lblLoading.visible = false
    
    m.categories = cats
    
    content = CreateObject("roSGNode", "ContentNode")
    for each cat in m.categories
        item = content.CreateChild("ContentNode")
        item.title = cat.category_name
    end for
    
    m.categoryList.content = content
    m.categoryList.setFocus(true)
    
    if m.categories.Count() > 0
        LoadChannelsForCategory(m.categories[0].category_id)
    end if
End Sub

Sub OnCategoryFocused()
    idx = m.categoryList.itemFocused
    if idx >= 0 and idx < m.categories.Count()
        cat = m.categories[idx]
        m.lblCategoryTitle.text = UCase(cat.category_name)
        LoadChannelsForCategory(cat.category_id)
    end if
End Sub

Sub LoadChannelsForCategory(catId as String)
    acc = m.top.accountData
    if acc = invalid return
    
    m.lblLoading.visible = true
    m.channelList.content = invalid
    
    channels = FetchLiveStreams(acc.serverDns, acc.username, acc.password, catId)
    m.lblLoading.visible = false
    m.channels = channels
    
    content = CreateObject("roSGNode", "ContentNode")
    for each ch in m.channels
        item = content.CreateChild("ContentNode")
        chName = ch.name
        if ch.num <> invalid
            chName = StrI(ch.num).Trim() + " - " + chName
        end if
        item.title = chName
    end for
    
    m.channelList.content = content
End Sub

Sub OnChannelSelected()
    idx = m.channelList.itemSelected
    if idx >= 0 and idx < m.channels.Count()
        ch = m.channels[idx]
        acc = m.top.accountData
        
        ' Monta a URL HLS ou TS do canal ao vivo
        streamId = StrI(ch.stream_id).Trim()
        streamUrl = acc.serverDns + "/live/" + acc.username + "/" + acc.password + "/" + streamId + ".m3u8"
        
        scene = m.top.getScene()
        if scene <> invalid
            scene.previousViewName = "LiveTvView"
            scene.callFunc("NavigateTo", "PlayerView", {
                streamUrl: streamUrl,
                title: ch.name,
                streamType: "live"
            })
        end if
    end if
End Sub

Function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press return false
    
    if key = "right" and m.currentFocus = "categories"
        if m.channels.Count() > 0
            m.currentFocus = "channels"
            m.channelList.setFocus(true)
            return true
        end if
    else if key = "left" and m.currentFocus = "channels"
        m.currentFocus = "categories"
        m.categoryList.setFocus(true)
        return true
    end if
    
    return false
End Function
