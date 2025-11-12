package com.example.defi.entities;

import jakarta.persistence.*;

@Entity
public class AlertHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAHistory;

    @ManyToOne
    @JoinColumn(name = "alert_id")
    private Alert alert;

    @ManyToOne
    @JoinColumn(name = "clinic_id")
    private Clinic clinic;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    public Long getIdAHistory() {
        return idAHistory;
    }

    public void setIdAHistory(Long idAHistory) {
        this.idAHistory = idAHistory;
    }

    public Alert getAlert() {
        return alert;
    }

    public void setAlert(Alert alert) {
        this.alert = alert;
    }

    public Clinic getClinic() {
        return clinic;
    }

    public void setClinic(Clinic clinic) {
        this.clinic = clinic;
    }

    public Patient getPatient() {
        return patient;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }
}
