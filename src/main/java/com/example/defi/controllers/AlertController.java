package com.example.defi.controllers;
import com.example.defi.entities.Alert;
import com.example.defi.services.AlertService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

private final AlertService alertService;

public AlertController(AlertService alertService) {
this.alertService = alertService;
}

@GetMapping("/all")
public List<Alert> getAllAlerts() {
return alertService.findAll();
}

@PostMapping("/add")
public Alert addAlert(@RequestBody Alert alert) {
return alertService.save(alert);
}

@GetMapping("/{id}")
public Alert getAlert(@PathVariable String id) {
return alertService.findById(id);
}

@DeleteMapping("/{id}")
public void deleteAlert(@PathVariable String id) {
alertService.delete(id);
}
}
