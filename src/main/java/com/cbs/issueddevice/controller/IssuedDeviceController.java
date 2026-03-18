package com.cbs.issueddevice.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.issueddevice.entity.IssuedDevice;
import com.cbs.issueddevice.service.IssuedDeviceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/issued-devices") @RequiredArgsConstructor
@Tag(name = "Issued Device Tracking", description = "Card, token, cheque book lifecycle management")
public class IssuedDeviceController {
    private final IssuedDeviceService service;

    @PostMapping @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IssuedDevice>> issue(@RequestBody IssuedDevice device) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.issue(device)));
    }
    @PostMapping("/{code}/activate") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<IssuedDevice>> activate(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.activate(code)));
    }
    @PostMapping("/{code}/block") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<IssuedDevice>> block(@PathVariable String code, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(service.block(code, reason)));
    }
    @PostMapping("/{code}/replace") @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<IssuedDevice>> replace(@PathVariable String code, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(service.replace(code, reason)));
    }
    @GetMapping("/customer/{id}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<IssuedDevice>>> getByCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByCustomer(id)));
    }
}
