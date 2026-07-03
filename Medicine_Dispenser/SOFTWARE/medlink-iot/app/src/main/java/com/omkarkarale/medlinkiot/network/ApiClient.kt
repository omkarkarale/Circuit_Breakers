package com.omkarkarale.medlinkiot.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object ApiClient {
    private var cachedBaseUrl: String? = null
    private var cachedApiService: ApiService? = null

    val apiService: ApiService
        get() {
            val currentBaseUrl = ApiConfig.baseUrl
            if (cachedApiService == null || cachedBaseUrl != currentBaseUrl) {
                cachedBaseUrl = currentBaseUrl
                cachedApiService = createApiService(currentBaseUrl)
            }
            return cachedApiService!!
        }

    private fun createApiService(baseUrl: String): ApiService {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .addConverterFactory(MoshiConverterFactory.create())
            .client(client)
            .build()

        return retrofit.create(ApiService::class.java)
    }
}
