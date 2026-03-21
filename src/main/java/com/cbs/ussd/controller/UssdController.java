package com.cbs.ussd.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.ussd.entity.UssdMenu;
import com.cbs.ussd.service.UssdService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/v1/ussd") @RequiredArgsConstructor
@Tag(name = "USSD Banking", description = "Menu-driven banking for feature phones with session management")
public class UssdController {

    private final UssdService ussdService;

    @PostMapping("/request")
    @Operation(summary = "Process a USSD request (new or continuation)")
    public ResponseEntity<ApiResponse<UssdService.UssdResponse>> processRequest(
            @RequestParam String msisdn,
            @RequestParam(required = false) String sessionId,
            @RequestParam(required = false) String input) {
        return ResponseEntity.ok(ApiResponse.ok(ussdService.processRequest(msisdn, sessionId, input)));
    }

    @PostMapping("/menus")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<UssdMenu>> createMenu(@RequestBody UssdMenu menu) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(ussdService.createMenu(menu)));
    }

    @GetMapping("/menus")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<UssdMenu>>> getRootMenus() {
        return ResponseEntity.ok(ApiResponse.ok(ussdService.getRootMenus()));
    }

    @GetMapping("/menus/all")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    @Operation(summary = "Get all USSD menus (root and child)")
    public ResponseEntity<ApiResponse<List<UssdMenu>>> getAllMenus() {
        return ResponseEntity.ok(ApiResponse.ok(ussdService.getAllMenus()));
    }

    @PutMapping("/menus/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Operation(summary = "Update an existing USSD menu")
    public ResponseEntity<ApiResponse<UssdMenu>> updateMenu(@PathVariable Long id, @RequestBody UssdMenu menu) {
        return ResponseEntity.ok(ApiResponse.ok(ussdService.updateMenu(id, menu)));
    }

    @DeleteMapping("/menus/{id}")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    @Operation(summary = "Delete a USSD menu")
    public ResponseEntity<ApiResponse<Void>> deleteMenu(@PathVariable Long id) {
        ussdService.deleteMenu(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
