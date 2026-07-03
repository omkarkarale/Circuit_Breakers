package com.omkarkarale.medlinkiot.network

object ApiConfig {
    const val DEFAULT_PORT = 80
    var protocol = "http"
    var host = "192.168.4.1"
    var port = DEFAULT_PORT

    val baseUrl: String
        get() = "$protocol://$host:$port/"
}
