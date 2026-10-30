package com.zyveron.play.data.model

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

data class SportsMatch(
    val id: String,
    val homeTeam: String,
    val awayTeam: String,
    val homeTeamBadge: String,
    val awayTeamBadge: String,
    val time: String,
    val league: String,
    val status: String = "EM BREVE",
    val channelTarget: String = "ESPN"
)

object SportsMatchProvider {

    fun getTodayMatches(): List<SportsMatch> {
        val today = LocalDate.now()
        val dayOfWeek = today.dayOfWeek.value // 1 (Segunda) a 7 (Domingo)

        // Partidas com horários do dia atual
        return listOf(
            SportsMatch(
                id = "match-1",
                homeTeam = "Real Madrid",
                awayTeam = "Barcelona",
                homeTeamBadge = "https://media.api-sports.io/football/teams/541.png",
                awayTeamBadge = "https://media.api-sports.io/football/teams/529.png",
                time = "16:00",
                league = "Spanish LALIGA",
                status = "AO VIVO",
                channelTarget = "ESPN"
            ),
            SportsMatch(
                id = "match-2",
                homeTeam = "Flamengo",
                awayTeam = "Palmeiras",
                homeTeamBadge = "https://media.api-sports.io/football/teams/127.png",
                awayTeamBadge = "https://media.api-sports.io/football/teams/121.png",
                time = "16:30",
                league = "Brasileirão Série A",
                status = "HOJE",
                channelTarget = "Premiere"
            ),
            SportsMatch(
                id = "match-3",
                homeTeam = "Arsenal",
                awayTeam = "Liverpool",
                homeTeamBadge = "https://media.api-sports.io/football/teams/42.png",
                awayTeamBadge = "https://media.api-sports.io/football/teams/40.png",
                time = "17:00",
                league = "Premier League",
                status = "HOJE",
                channelTarget = "ESPN"
            ),
            SportsMatch(
                id = "match-4",
                homeTeam = "PSG",
                awayTeam = "Marseille",
                homeTeamBadge = "https://media.api-sports.io/football/teams/85.png",
                awayTeamBadge = "https://media.api-sports.io/football/teams/81.png",
                time = "17:05",
                league = "French Ligue 1",
                status = "HOJE",
                channelTarget = "CazéTV"
            ),
            SportsMatch(
                id = "match-5",
                homeTeam = "Corinthians",
                awayTeam = "São Paulo",
                homeTeamBadge = "https://media.api-sports.io/football/teams/131.png",
                awayTeamBadge = "https://media.api-sports.io/football/teams/126.png",
                time = "19:00",
                league = "Brasileirão Série A",
                status = "HOJE",
                channelTarget = "Premiere"
            ),
            SportsMatch(
                id = "match-6",
                homeTeam = "UFC Fight Night",
                awayTeam = "Card Principal",
                homeTeamBadge = "https://upload.wikimedia.org/wikipedia/commons/0/0d/UFC_logo.svg",
                awayTeamBadge = "https://upload.wikimedia.org/wikipedia/commons/0/0d/UFC_logo.svg",
                time = "21:30",
                league = "UFC • Combate",
                status = "HOJE",
                channelTarget = "Combate"
            )
        )
    }
}

