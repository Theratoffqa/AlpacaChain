package com.alpaquitay.contractpay.repository

import android.content.Context
import android.net.Uri
import com.alpaquitay.contractpay.network.ApiClient
import com.alpaquitay.contractpay.network.ContractData
import com.alpaquitay.contractpay.network.CloverOrder
import com.alpaquitay.contractpay.network.IntegrityResult
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream

/**
 * Repository layer that handles data operations.
 * Abstracts network calls from the ViewModel.
 */
class ContractRepository {

    private val api = ApiClient.apiService

    /**
     * Authenticate and store token.
     */
    suspend fun authenticate(userId: String, apiKey: String): Result<String> {
        return try {
            val response = api.getToken(mapOf("userId" to userId, "apiKey" to apiKey))
            if (response.isSuccessful) {
                val token = response.body()!!.token
                ApiClient.setToken(token)
                Result.success(token)
            } else {
                Result.failure(Exception("Auth failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Upload a contract file from a URI (content:// or file://).
     * Copies the file to a temp location for upload.
     */
    suspend fun uploadContract(context: Context, fileUri: Uri): Result<ContractData> {
        return try {
            // Copy URI content to temp file
            val tempFile = copyUriToTempFile(context, fileUri)
            val mimeType = context.contentResolver.getType(fileUri) ?: "application/pdf"

            val requestBody = tempFile.asRequestBody(mimeType.toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData(
                "contract",
                tempFile.name,
                requestBody
            )

            val response = api.uploadContract(part)

            // Clean up temp file
            tempFile.delete()

            if (response.isSuccessful) {
                Result.success(response.body()!!.contract)
            } else {
                Result.failure(Exception("Upload failed: ${response.code()} ${response.errorBody()?.string()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Upload text content as a contract.
     */
    suspend fun uploadTextContract(content: String, title: String): Result<ContractData> {
        return try {
            val response = api.uploadTextContract(
                mapOf("content" to content, "title" to title)
            )
            if (response.isSuccessful) {
                Result.success(response.body()!!.contract)
            } else {
                Result.failure(Exception("Upload failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Verify contract integrity.
     */
    suspend fun verifyContract(contractId: String): Result<IntegrityResult> {
        return try {
            val response = api.verifyContract(contractId)
            if (response.isSuccessful) {
                Result.success(response.body()!!.integrity)
            } else {
                Result.failure(Exception("Verification failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Create a Clover order for payment.
     */
    suspend fun createCloverOrder(contractId: String, amountCents: Int): Result<CloverOrder> {
        return try {
            val response = api.createCloverOrder(
                mapOf(
                    "contractId" to contractId,
                    "amountCents" to amountCents
                )
            )
            if (response.isSuccessful) {
                Result.success(response.body()!!.order)
            } else {
                Result.failure(Exception("Order creation failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Verify Clover payment was completed.
     */
    suspend fun verifyCloverPayment(orderId: String, contractId: String): Result<Boolean> {
        return try {
            val response = api.verifyCloverPayment(
                mapOf("orderId" to orderId, "contractId" to contractId)
            )
            if (response.isSuccessful) {
                Result.success(response.body()!!.contractStatus == "paid")
            } else {
                Result.failure(Exception("Verification failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // ──────────────────────────────────────────
    // Helper: Copy content URI to temp file
    // ──────────────────────────────────────────
    private fun copyUriToTempFile(context: Context, uri: Uri): File {
        val inputStream = context.contentResolver.openInputStream(uri)
            ?: throw Exception("Cannot open file from URI")

        val tempFile = File.createTempFile("contract_", ".tmp", context.cacheDir)
        FileOutputStream(tempFile).use { output ->
            inputStream.copyTo(output)
        }
        inputStream.close()

        return tempFile
    }
}
