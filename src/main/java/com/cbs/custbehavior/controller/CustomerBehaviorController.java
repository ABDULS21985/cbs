package com.cbs.custbehavior.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.custbehavior.entity.CustomerBehaviorModel;
import com.cbs.custbehavior.service.CustomerBehaviorService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/customer-behavior")
@RequiredArgsConstructor
@Tag(name = "Customer Behavior Models", description = "Behavioral scoring, churn prediction, cross-sell propensity")
public class CustomerBehaviorController {

    private final CustomerBehaviorService service;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<CustomerBehaviorModel>> score(@RequestBody CustomerBehaviorModel model) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.score(model)));
    }

    @GetMapping("/customer/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<CustomerBehaviorModel>>> getCurrentModels(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getCurrentModels(id)));
    }

    @GetMapping("/customer/{id}/type/{type}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<CustomerBehaviorModel>> getByType(@PathVariable Long id, @PathVariable String type) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByType(id, type)));
    }
}
