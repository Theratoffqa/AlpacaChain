package com.alpaquitay.contractpay.ui

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.alpaquitay.contractpay.viewmodel.ContractViewModel
import com.clover.sdk.v1.Intents

/**
 * MainActivity - The main entry point for the contract payment flow.
 * 
 * This is a MINIMAL, FUNCTIONAL activity focused on end-to-end flow.
 * No fancy UI - just the working pipeline:
 * 
 *   1. Authenticate with backend
 *   2. Select and upload a contract (PDF/TXT)
 *   3. Display SHA-256 hash from backend
 *   4. Create payment order on backend
 *   5. Launch Clover payment intent
 *   6. Verify payment completion
 * 
 * On a Clover device, this launches the native Clover payment UI.
 * On a non-Clover device, the Clover intent will fail gracefully.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "ContractPay"
        private const val CLOVER_PAYMENT_REQUEST = 1001
    }

    private val viewModel: ContractViewModel by viewModels()

    // Current state tracking
    private var currentContractId: String? = null
    private var currentOrderId: String? = null

    // ──────────────────────────────────────────
    // File Picker - uses Activity Result API
    // ──────────────────────────────────────────
    private val filePicker = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        uri?.let { fileUri ->
            Log.d(TAG, "File selected: $fileUri")
            viewModel.uploadContract(this, fileUri)
        } ?: run {
            Log.d(TAG, "File selection cancelled")
        }
    }

    // ──────────────────────────────────────────
    // Lifecycle
    // ──────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // No complex layout - this is functional, not UI-focused
        // In production, bind with ViewBinding to a proper layout
        Log.d(TAG, "=== Contract Payment App Started ===")

        setupObservers()
        startFlow()
    }

    // ──────────────────────────────────────────
    // Observe ViewModel State
    // ──────────────────────────────────────────

    private fun setupObservers() {

        viewModel.isAuthenticated.observe(this) { authenticated ->
            if (authenticated) {
                Log.d(TAG, "✅ Authenticated - Ready to upload contract")
                toast("Authenticated successfully")
                // Proceed to file selection
                openFilePicker()
            }
        }

        viewModel.uploadedContract.observe(this) { contract ->
            contract?.let {
                Log.d(TAG, "✅ Contract uploaded:")
                Log.d(TAG, "   ID: ${it.id}")
                Log.d(TAG, "   Name: ${it.originalName}")
                Log.d(TAG, "   SHA-256: ${it.sha256Hash}")
                Log.d(TAG, "   Status: ${it.status}")

                toast("Contract uploaded! Hash: ${it.sha256Hash.take(16)}...")

                currentContractId = it.id

                // Automatically verify integrity
                viewModel.verifyContract(it.id)
            }
        }

        viewModel.verificationResult.observe(this) { result ->
            result?.let {
                Log.d(TAG, "✅ Integrity verification:")
                Log.d(TAG, "   Valid: ${it.isValid}")
                Log.d(TAG, "   Stored hash: ${it.storedHash}")
                Log.d(TAG, "   Computed hash: ${it.computedHash}")

                if (it.isValid) {
                    toast("Contract integrity verified ✓")
                    // Proceed to payment
                    currentContractId?.let { id ->
                        createPaymentOrder(id, 1000) // $10.00 example amount
                    }
                } else {
                    toast("⚠️ Contract integrity FAILED - hashes don't match!")
                    Log.e(TAG, "INTEGRITY FAILURE - contract may have been tampered with")
                }
            }
        }

        viewModel.cloverOrder.observe(this) { order ->
            order?.let {
                Log.d(TAG, "✅ Clover order created: ${it.orderId}")
                currentOrderId = it.orderId
                toast("Order created, launching payment...")

                // Launch Clover payment
                launchCloverPayment(it.orderId, it.amountCents.toLong())
            }
        }

        viewModel.paymentVerified.observe(this) { isPaid ->
            isPaid?.let {
                if (it) {
                    Log.d(TAG, "✅ PAYMENT CONFIRMED - Full flow complete!")
                    toast("Payment confirmed! Contract is fully processed.")
                } else {
                    Log.e(TAG, "❌ Payment verification failed")
                    toast("Payment could not be verified")
                }
            }
        }

        viewModel.error.observe(this) { errorMsg ->
            errorMsg?.let {
                Log.e(TAG, "Error: $it")
                toast("Error: $it")
            }
        }

        viewModel.isLoading.observe(this) { loading ->
            Log.d(TAG, if (loading) "⏳ Loading..." else "✅ Done")
        }
    }

    // ──────────────────────────────────────────
    // Flow Steps
    // ──────────────────────────────────────────

    /**
     * Step 1: Authenticate with backend.
     * In production, get credentials from secure storage or Clover Account.
     */
    private fun startFlow() {
        Log.d(TAG, "Step 1: Authenticating...")
        viewModel.authenticate(
            userId = "clover-device-001",
            apiKey = "your-super-secret-key-change-in-production" // Match .env JWT_SECRET
        )
    }

    /**
     * Step 2: Open file picker for contract selection.
     */
    private fun openFilePicker() {
        Log.d(TAG, "Step 2: Opening file picker...")
        filePicker.launch(arrayOf(
            "application/pdf",
            "text/plain"
        ))
    }

    /**
     * Step 4: Create payment order on backend.
     */
    private fun createPaymentOrder(contractId: String, amountCents: Int) {
        Log.d(TAG, "Step 4: Creating Clover order...")
        viewModel.createCloverOrder(contractId, amountCents)
    }

    /**
     * Step 5: Launch Clover native payment intent.
     * 
     * This is the KEY integration point with Clover POS.
     * The Clover device handles the entire payment UX:
     * - Card swipe/tap/insert
     * - PIN entry
     * - Signature capture
     * - Receipt handling
     * 
     * We just fire an Intent and wait for the result.
     */
    private fun launchCloverPayment(orderId: String, amountCents: Long) {
        Log.d(TAG, "Step 5: Launching Clover payment intent...")

        try {
            val paymentIntent = Intent(Intents.ACTION_CLOVER_PAY).apply {
                // Amount in cents
                putExtra(Intents.EXTRA_AMOUNT, amountCents)

                // Link to our order
                putExtra(Intents.EXTRA_ORDER_ID, orderId)

                // Optional: Configure payment options
                putExtra(Intents.EXTRA_CARD_ENTRY_METHODS,
                    Intents.CARD_ENTRY_METHOD_MAG_STRIPE or
                    Intents.CARD_ENTRY_METHOD_ICC_CONTACT or
                    Intents.CARD_ENTRY_METHOD_NFC_CONTACTLESS
                )

                // Optional: Allow manual card entry
                putExtra(Intents.EXTRA_ALLOW_MANUAL_CARD_ENTRY, false)

                // Optional: Disable cashback
                putExtra(Intents.EXTRA_DISABLE_CASHBACK, true)
            }

            startActivityForResult(paymentIntent, CLOVER_PAYMENT_REQUEST)

        } catch (e: Exception) {
            // Not running on a Clover device
            Log.e(TAG, "Clover intent failed (not on Clover device?): ${e.message}")
            toast("Clover payment not available - not on Clover device")

            // For testing: simulate payment success
            Log.d(TAG, "🧪 Simulating payment success for testing...")
            currentOrderId?.let { orderId ->
                currentContractId?.let { contractId ->
                    viewModel.verifyPayment(orderId, contractId)
                }
            }
        }
    }

    // ──────────────────────────────────────────
    // Handle Clover Payment Result
    // ──────────────────────────────────────────

    @Deprecated("Using onActivityResult for Clover SDK compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == CLOVER_PAYMENT_REQUEST) {
            when (resultCode) {
                Activity.RESULT_OK -> {
                    Log.d(TAG, "Step 6: Clover payment completed, verifying...")

                    // Extract payment info from Clover result
                    val paymentId = data?.getStringExtra(Intents.EXTRA_PAYMENT_ID)
                    Log.d(TAG, "   Clover Payment ID: $paymentId")

                    // Verify with our backend
                    currentOrderId?.let { orderId ->
                        currentContractId?.let { contractId ->
                            viewModel.verifyPayment(orderId, contractId)
                        }
                    }
                }
                Activity.RESULT_CANCELED -> {
                    Log.d(TAG, "Payment cancelled by user")
                    toast("Payment cancelled")
                }
                else -> {
                    Log.e(TAG, "Payment failed with result code: $resultCode")
                    toast("Payment failed")
                }
            }
        }
    }

    // ──────────────────────────────────────────
    // Utility
    // ──────────────────────────────────────────

    private fun toast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
}
