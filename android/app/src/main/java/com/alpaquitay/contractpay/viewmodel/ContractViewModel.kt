package com.alpaquitay.contractpay.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.alpaquitay.contractpay.network.ContractData
import com.alpaquitay.contractpay.network.CloverOrder
import com.alpaquitay.contractpay.network.IntegrityResult
import com.alpaquitay.contractpay.repository.ContractRepository
import kotlinx.coroutines.launch

/**
 * ViewModel managing the contract upload, verification, and payment flow.
 * 
 * This is the orchestrator that the Activity/Fragment communicates with.
 * All operations are launched in viewModelScope (lifecycle-aware coroutines).
 */
class ContractViewModel : ViewModel() {

    private val repository = ContractRepository()

    // ──────────────────────────────────────────
    // State holders
    // ──────────────────────────────────────────

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _isAuthenticated = MutableLiveData(false)
    val isAuthenticated: LiveData<Boolean> = _isAuthenticated

    private val _uploadedContract = MutableLiveData<ContractData?>()
    val uploadedContract: LiveData<ContractData?> = _uploadedContract

    private val _verificationResult = MutableLiveData<IntegrityResult?>()
    val verificationResult: LiveData<IntegrityResult?> = _verificationResult

    private val _cloverOrder = MutableLiveData<CloverOrder?>()
    val cloverOrder: LiveData<CloverOrder?> = _cloverOrder

    private val _paymentVerified = MutableLiveData<Boolean?>()
    val paymentVerified: LiveData<Boolean?> = _paymentVerified

    // ──────────────────────────────────────────
    // Authentication
    // ──────────────────────────────────────────

    fun authenticate(userId: String, apiKey: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.authenticate(userId, apiKey)
                .onSuccess {
                    _isAuthenticated.value = true
                }
                .onFailure {
                    _error.value = "Authentication failed: ${it.message}"
                    _isAuthenticated.value = false
                }

            _isLoading.value = false
        }
    }

    // ──────────────────────────────────────────
    // Contract Upload (file)
    // ──────────────────────────────────────────

    fun uploadContract(context: Context, fileUri: Uri) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.uploadContract(context, fileUri)
                .onSuccess { contract ->
                    _uploadedContract.value = contract
                }
                .onFailure {
                    _error.value = "Upload failed: ${it.message}"
                }

            _isLoading.value = false
        }
    }

    // ──────────────────────────────────────────
    // Contract Upload (text)
    // ──────────────────────────────────────────

    fun uploadTextContract(content: String, title: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.uploadTextContract(content, title)
                .onSuccess { contract ->
                    _uploadedContract.value = contract
                }
                .onFailure {
                    _error.value = "Upload failed: ${it.message}"
                }

            _isLoading.value = false
        }
    }

    // ──────────────────────────────────────────
    // Contract Verification
    // ──────────────────────────────────────────

    fun verifyContract(contractId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.verifyContract(contractId)
                .onSuccess { result ->
                    _verificationResult.value = result
                }
                .onFailure {
                    _error.value = "Verification failed: ${it.message}"
                }

            _isLoading.value = false
        }
    }

    // ──────────────────────────────────────────
    // Clover Payment - Step 1: Create Order
    // ──────────────────────────────────────────

    fun createCloverOrder(contractId: String, amountCents: Int) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.createCloverOrder(contractId, amountCents)
                .onSuccess { order ->
                    _cloverOrder.value = order
                }
                .onFailure {
                    _error.value = "Order creation failed: ${it.message}"
                }

            _isLoading.value = false
        }
    }

    // ──────────────────────────────────────────
    // Clover Payment - Step 3: Verify Payment
    // (Step 2 is the Clover Intent, handled in Activity)
    // ──────────────────────────────────────────

    fun verifyPayment(orderId: String, contractId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            repository.verifyCloverPayment(orderId, contractId)
                .onSuccess { isPaid ->
                    _paymentVerified.value = isPaid
                }
                .onFailure {
                    _error.value = "Payment verification failed: ${it.message}"
                }

            _isLoading.value = false
        }
    }

    // ──────────────────────────────────────────
    // Reset
    // ──────────────────────────────────────────

    fun clearError() {
        _error.value = null
    }

    fun reset() {
        _uploadedContract.value = null
        _verificationResult.value = null
        _cloverOrder.value = null
        _paymentVerified.value = null
        _error.value = null
    }
}
