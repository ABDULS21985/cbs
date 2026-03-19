package com.cbs.ivr.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.ivr.entity.*;
import com.cbs.ivr.service.IvrService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/ivr") @RequiredArgsConstructor
@Tag(name = "IVR / Voice Services", description = "IVR menu management, session navigation, agent transfer")
public class IvrController {
    private final IvrService ivrService;
    @PostMapping("/menus") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<IvrMenu>> createMenu(@RequestBody IvrMenu menu) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(ivrService.createMenu(menu))); }
    @GetMapping("/menus") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<IvrMenu>>> getRootMenus() { return ResponseEntity.ok(ApiResponse.ok(ivrService.getRootMenus())); }
    @GetMapping("/sessions") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<IvrSession>>> listSessions() { return ResponseEntity.ok(ApiResponse.ok(ivrService.getAllSessions())); }
    @PostMapping("/sessions") public ResponseEntity<ApiResponse<IvrSession>> startSession(@RequestParam String callerNumber, @RequestParam(required = false) Long customerId) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(ivrService.startSession(callerNumber, customerId))); }
    @PostMapping("/sessions/{sessionId}/navigate") public ResponseEntity<ApiResponse<IvrSession>> navigate(@PathVariable String sessionId, @RequestParam String option) { return ResponseEntity.ok(ApiResponse.ok(ivrService.navigate(sessionId, option))); }
    @PostMapping("/sessions/{sessionId}/transfer") public ResponseEntity<ApiResponse<IvrSession>> transfer(@PathVariable String sessionId, @RequestParam String reason) { return ResponseEntity.ok(ApiResponse.ok(ivrService.transferToAgent(sessionId, reason))); }
}
