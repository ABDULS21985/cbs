package com.cbs.msganalysis.controller;
import com.cbs.common.dto.ApiResponse;
import com.cbs.msganalysis.entity.MessageAnalysis;
import com.cbs.msganalysis.service.MessageAnalysisService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*; import java.util.List;
@RestController @RequestMapping("/v1/message-analysis") @RequiredArgsConstructor
@Tag(name = "Financial Message Analysis", description = "Message validation, sanctions screening, duplicate detection, pattern analysis")
public class MessageAnalysisController {
    private final MessageAnalysisService service;
    @PostMapping @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<MessageAnalysis>> analyze(@RequestBody MessageAnalysis analysis) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.analyze(analysis))); }
    @GetMapping("/message/{ref}") @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')") public ResponseEntity<ApiResponse<List<MessageAnalysis>>> byMessage(@PathVariable String ref) { return ResponseEntity.ok(ApiResponse.ok(service.getByMessage(ref))); }
    @GetMapping("/action-required") @PreAuthorize("hasRole('CBS_ADMIN')") public ResponseEntity<ApiResponse<List<MessageAnalysis>>> actionRequired() { return ResponseEntity.ok(ApiResponse.ok(service.getActionRequired())); }
}
