package com.cbs.lockbox.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.lockbox.entity.*;
import com.cbs.lockbox.service.LockboxService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/v1/lockboxes") @RequiredArgsConstructor
@Tag(name = "Cheque Lock Box", description = "Lockbox cheque processing — OCR scanning, auto-deposit, exception handling")
public class LockboxController {
    private final LockboxService lockboxService;

    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Lockbox>> create(@RequestBody Lockbox lockbox) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(lockboxService.createLockbox(lockbox)));
    }
    @PostMapping("/{number}/items") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LockboxItem>> receive(@PathVariable String number, @RequestBody LockboxItem item) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(lockboxService.receiveItem(number, item)));
    }
    @PostMapping("/items/{itemId}/exception") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LockboxItem>> exception(@PathVariable Long itemId, @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.ok(lockboxService.markException(itemId, reason)));
    }
    @PostMapping("/items/{itemId}/deposit") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<LockboxItem>> deposit(@PathVariable Long itemId) {
        return ResponseEntity.ok(ApiResponse.ok(lockboxService.depositItem(itemId)));
    }
    @GetMapping("/{number}/items") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<LockboxItem>>> items(@PathVariable String number, @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.ok(lockboxService.getItems(number, status)));
    }
    @GetMapping("/{number}/summary") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> summary(@PathVariable String number) {
        return ResponseEntity.ok(ApiResponse.ok(lockboxService.getLockboxSummary(number)));
    }
}
