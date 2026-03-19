package com.cbs.creditmargin.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.creditmargin.entity.*; import com.cbs.creditmargin.service.CreditMarginService;
import io.swagger.v3.oas.annotations.tags.Tag; import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.math.BigDecimal; import java.util.List;
@RestController @RequestMapping("/v1/credit-margin") @RequiredArgsConstructor
@Tag(name = "Credit & Margin Management", description = "Margin calls, collateral positions, settlement")
public class CreditMarginController {
    private final CreditMarginService service;
    @GetMapping("/margin-calls") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarginCall>>> listMarginCalls() { return ResponseEntity.ok(ApiResponse.ok(service.getOpenCalls())); }
    @GetMapping("/collateral") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<CollateralPosition>>> listCollateral() { return ResponseEntity.ok(ApiResponse.ok(service.getAllCollateralPositions())); }
    @PostMapping("/margin-calls") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarginCall>> issue(@RequestBody MarginCall call) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.issueMarginCall(call))); }
    @PostMapping("/margin-calls/{ref}/acknowledge") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<MarginCall>> acknowledge(@PathVariable String ref) { return ResponseEntity.ok(ApiResponse.ok(service.acknowledgeCall(ref))); }
    @PostMapping("/margin-calls/{ref}/settle") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<MarginCall>> settle(@PathVariable String ref, @RequestParam BigDecimal agreedAmount, @RequestParam String collateralType) { return ResponseEntity.ok(ApiResponse.ok(service.settleCall(ref, agreedAmount, collateralType))); }
    @PostMapping("/collateral") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<CollateralPosition>> recordCollateral(@RequestBody CollateralPosition pos) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.recordCollateral(pos))); }
    @GetMapping("/margin-calls/counterparty/{code}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarginCall>>> byCounterparty(@PathVariable String code) { return ResponseEntity.ok(ApiResponse.ok(service.getByCounterparty(code))); }
    @GetMapping("/margin-calls/open") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MarginCall>>> openCalls() { return ResponseEntity.ok(ApiResponse.ok(service.getOpenCalls())); }
    @GetMapping("/margin-calls/{ref}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<MarginCall>> getCall(@PathVariable String ref) { return ResponseEntity.ok(ApiResponse.ok(service.getCallByRef(ref))); }
}
