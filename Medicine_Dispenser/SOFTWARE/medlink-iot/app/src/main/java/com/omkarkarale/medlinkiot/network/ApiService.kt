package com.omkarkarale.medlinkiot.network

import com.omkarkarale.medlinkiot.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @GET("api/v1/status")
    suspend fun getDeviceStatus(): DeviceStatus

    @GET("api/v1/health")
    suspend fun getHealth(): Map<String, String>

    @GET("api/v1/medicines")
    suspend fun getMedicines(): List<Medicine>

    @POST("api/v1/medicines")
    suspend fun addOrUpdateMedicine(@Body medicine: Medicine): Medicine

    @DELETE("api/v1/medicines/{id}")
    suspend fun deleteMedicine(@Path("id") id: Int): Response<Unit>

    @GET("api/v1/logs")
    suspend fun getLogs(): List<LogEntry>

    @GET("api/v1/diagnostics")
    suspend fun getDiagnostics(): DiagnosticResult

    @POST("api/v1/test/dispenser/{slot}")
    suspend fun testDispenser(@Path("slot") slot: Int): DispenseResult

    @POST("api/v1/test/audio")
    suspend fun testAudio(): DispenseResult

    @POST("api/v1/test/rtc")
    suspend fun testRtc(): DispenseResult

    @POST("api/v1/test/ir")
    suspend fun testIr(): DispenseResult

    @GET("api/v1/dashboard")
    suspend fun getDashboardData(): DashboardData
}
