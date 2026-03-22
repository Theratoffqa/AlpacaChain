package com.alpaquitay.contractpay.network

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

/**
 * Retrofit API interface defining all backend endpoints.
 */
interface ApiService {

    // ──────────────────────────────────────────
    // Authentication
    // ──────────────────────────────────────────

    @POST("auth/token")
    suspend fun getToken(
        @Body body: Map<String, String>
    ): Response<TokenResponse>

    // ──────────────────────────────────────────
    // Contracts
    // ──────────────────────────────────────────

    /**
     * Upload a contract file (PDF or TXT).
     * Uses multipart form data for file upload.
     */
    @Multipart
    @POST("contracts/upload")
    suspend fun uploadContract(
        @Part contract: MultipartBody.Part,
        @Part("metadata") metadata: RequestBody? = null
    ): Response<UploadResponse>

    /**
     * Upload a text contract directly (no file).
     */
    @POST("contracts/upload-text")
    suspend fun uploadTextContract(
        @Body body: Map<String, String>
    ): Response<UploadResponse>

    /**
     * Get contract details by ID.
     */
    @GET("contracts/{id}")
    suspend fun getContract(
        @Path("id") contractId: String
    ): Response<ContractDetailResponse>

    /**
     * Verify contract integrity (recompute hash).
     */
    @POST("contracts/{id}/verify")
    suspend fun verifyContract(
        @Path("id") contractId: String
    ): Response<VerifyResponse>

    /**
     * List all contracts for the current user.
     */
    @GET("contracts")
    suspend fun listContracts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ContractListResponse>

    // ──────────────────────────────────────────
    // Payments
    // ──────────────────────────────────────────

    /**
     * Create a Clover order for payment.
     */
    @POST("payments/clover/create-order")
    suspend fun createCloverOrder(
        @Body body: Map<String, Any>
    ): Response<CloverOrderResponse>

    /**
     * Verify Clover payment completion.
     */
    @POST("payments/clover/verify")
    suspend fun verifyCloverPayment(
        @Body body: Map<String, String>
    ): Response<PaymentVerifyResponse>

    /**
     * Get payment status for a contract.
     */
    @GET("payments/status/{contractId}")
    suspend fun getPaymentStatus(
        @Path("contractId") contractId: String
    ): Response<PaymentStatusResponse>
}

// ──────────────────────────────────────────────
// Response Data Classes
// ──────────────────────────────────────────────

data class TokenResponse(
    val token: String,
    val type: String,
    val expiresIn: String,
    val userId: String
)

data class UploadResponse(
    val message: String,
    val contract: ContractData
)

data class ContractData(
    val id: String,
    val originalName: String,
    val mimeType: String? = null,
    val fileSize: Long? = null,
    val sha256Hash: String,
    val hashGeneratedAt: String,
    val status: String,
    val createdAt: String? = null
)

data class ContractDetailResponse(
    val contract: ContractDetail
)

data class ContractDetail(
    val id: String,
    val originalName: String,
    val mimeType: String,
    val fileSize: Long,
    val sha256Hash: String,
    val hashGeneratedAt: String,
    val status: String,
    val paymentStatus: String,
    val paymentProvider: String,
    val createdAt: String,
    val updatedAt: String
)

data class VerifyResponse(
    val contractId: String,
    val integrity: IntegrityResult
)

data class IntegrityResult(
    val isValid: Boolean,
    val storedHash: String,
    val computedHash: String,
    val verifiedAt: String,
    val status: String
)

data class ContractListResponse(
    val contracts: List<ContractData>,
    val pagination: PaginationData
)

data class PaginationData(
    val page: Int,
    val limit: Int,
    val total: Int,
    val pages: Int
)

data class CloverOrderResponse(
    val message: String,
    val order: CloverOrder
)

data class CloverOrder(
    val orderId: String,
    val merchantId: String,
    val amountCents: Int,
    val contractId: String,
    val status: String
)

data class PaymentVerifyResponse(
    val message: String,
    val verification: Map<String, Any>,
    val contractStatus: String?
)

data class PaymentStatusResponse(
    val contractId: String,
    val paymentStatus: String,
    val paymentProvider: String,
    val paymentId: String?,
    val amountCents: Int,
    val contractStatus: String
)
