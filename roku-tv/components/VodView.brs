' ===================================================
' ZYVERON PLAY - CONTROLLER DE FILMES E SÉRIES
' ===================================================

Sub init()
    m.lblSectionTitle = m.top.findNode("lblSectionTitle")
    m.posterGrid = m.top.findNode("posterGrid")
    m.lblFocusedTitle = m.top.findNode("lblFocusedTitle")
    m.lblFocusedMeta = m.top.findNode("lblFocusedMeta")
    m.lblLoading = m.top.findNode("lblLoading")
    
    m.mode = "movies" ' ou "series"
    m.categories = []
    m.items = []
    
    m.posterGrid.observeField("itemFocused", "OnItemFocused")
    m.posterGrid.observeField("itemSelected", "OnItemSelected")
End Sub

Sub OnViewParamsChange()
    params = m.top.viewParams
    if params <> invalid and params.mode <> invalid
        m.mode = params.mode
        if m.mode = "series"
            m.lblSectionTitle.text = "|  SÉRIES"
        else
            m.lblSectionTitle.text = "|  FILMES"
        end if
    end if
    LoadVodData()
End Sub

Sub OnAccountDataChange()
    LoadVodData()
End Sub

Sub LoadVodData()
    acc = m.top.accountData
    if acc = invalid return
    
    m.lblLoading.visible = true
    
    if m.mode = "series"
        m.categories = FetchSeriesCategories(acc.serverDns, acc.username, acc.password)
    else
        m.categories = FetchVodCategories(acc.serverDns, acc.username, acc.password)
    end if
    
    catId = ""
    if m.categories.Count() > 0
        catId = m.categories[0].category_id
    end if
    
    LoadItemsForCategory(catId)
End Sub

Sub LoadItemsForCategory(catId as String)
    acc = m.top.accountData
    if acc = invalid return
    
    m.lblLoading.visible = true
    m.posterGrid.content = invalid
    
    if m.mode = "series"
        items = FetchSeriesStreams(acc.serverDns, acc.username, acc.password, catId)
    else
        items = FetchVodStreams(acc.serverDns, acc.username, acc.password, catId)
    end if
    
    m.lblLoading.visible = false
    m.items = items
    
    content = CreateObject("roSGNode", "ContentNode")
    for each itm in m.items
        node = content.CreateChild("ContentNode")
        node.title = itm.name
        
        iconUrl = ""
        if itm.stream_icon <> invalid and itm.stream_icon <> ""
            iconUrl = itm.stream_icon
        else if itm.cover <> invalid and itm.cover <> ""
            iconUrl = itm.cover
        end if
        
        node.hdPosterUrl = iconUrl
        node.fhdPosterUrl = iconUrl
    end for
    
    m.posterGrid.content = content
    m.posterGrid.setFocus(true)
End Sub

Sub OnItemFocused()
    idx = m.posterGrid.itemFocused
    if idx >= 0 and idx < m.items.Count()
        itm = m.items[idx]
        m.lblFocusedTitle.text = itm.name
        
        rating = ""
        if itm.rating <> invalid and itm.rating <> ""
            rating = " ★ " + Str(itm.rating).Trim()
        end if
        
        m.lblFocusedMeta.text = "Pressione [OK] para iniciar a reprodução" + rating
    end if
End Sub

Sub OnItemSelected()
    idx = m.posterGrid.itemSelected
    if idx >= 0 and idx < m.items.Count()
        itm = m.items[idx]
        acc = m.top.accountData
        
        ext = "mp4"
        if itm.container_extension <> invalid and itm.container_extension <> ""
            ext = itm.container_extension
        end if
        
        streamId = StrI(itm.stream_id).Trim()
        if streamId = "0" and itm.series_id <> invalid
            streamId = StrI(itm.series_id).Trim()
        end if
        
        if m.mode = "series"
            streamUrl = acc.serverDns + "/series/" + acc.username + "/" + acc.password + "/" + streamId + "." + ext
        else
            streamUrl = acc.serverDns + "/movie/" + acc.username + "/" + acc.password + "/" + streamId + "." + ext
        end if
        
        scene = m.top.getScene()
        if scene <> invalid
            scene.previousViewName = "VodView"
            scene.callFunc("NavigateTo", "PlayerView", {
                streamUrl: streamUrl,
                title: itm.name,
                streamType: "vod"
            })
        end if
    end if
End Sub
