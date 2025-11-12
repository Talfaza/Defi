package com.example.defi.services;
import com.example.defi.entities.Alert;
import com.example.defi.repositories.AlertRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class AlertService {
    private final AlertRepository alertRepository;

    public AlertService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    public List<Alert> findAll() {
        return alertRepository.findAll();
    }

    public Alert save(Alert alert) {
        return alertRepository.save(alert);
    }

    public Alert findById(String id) {
        return alertRepository.findById(id).orElse(null);
    }

    public void delete(String id) {
        alertRepository.deleteById(id);
    }
}
