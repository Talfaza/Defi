package com.example.defi.entities;

import jakarta.persistence.*;

@Entity
public class PaymentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idPHistory;

    @ManyToOne
    @JoinColumn(name = "clinic_id")
    private Clinic clinic;

    @ManyToOne
    @JoinColumn(name = "payment_request_id")
    private PaymentRequest paymentRequest;

    public Long getIdPHistory() {
        return idPHistory;
    }

    public void setIdPHistory(Long idPHistory) {
        this.idPHistory = idPHistory;
    }

    public Clinic getClinic() {
        return clinic;
    }

    public void setClinic(Clinic clinic) {
        this.clinic = clinic;
    }

    public PaymentRequest getPaymentRequest() {
        return paymentRequest;
    }

    public void setPaymentRequest(PaymentRequest paymentRequest) {
        this.paymentRequest = paymentRequest;
    }

    // Getters and setters
}
