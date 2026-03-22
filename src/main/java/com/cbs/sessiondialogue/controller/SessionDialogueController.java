package com.cbs.sessiondialogue.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.sessiondialogue.entity.DialogueMessage;
import com.cbs.sessiondialogue.entity.DialogueSession;
import com.cbs.sessiondialogue.repository.DialogueSessionRepository;
import com.cbs.sessiondialogue.service.SessionDialogueService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/dialogue")
@RequiredArgsConstructor
@Tag(name = "Session Dialogue", description = "Stateful conversation session management across channels")
public class SessionDialogueController {

    private final SessionDialogueService service;
    private final DialogueSessionRepository sessionRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DialogueSession>> startSession(@RequestBody DialogueSession session) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.startSession(session)));
    }

    @PostMapping("/{code}/messages")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DialogueMessage>> addMessage(@PathVariable String code, @RequestBody DialogueMessage message) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addMessage(code, message)));
    }

    @PostMapping("/{code}/escalate")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DialogueSession>> escalateToHuman(@PathVariable String code, @RequestParam String agentId) {
        return ResponseEntity.ok(ApiResponse.ok(service.escalateToHuman(code, agentId)));
    }

    @PostMapping("/{code}/end")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<DialogueSession>> endSession(@PathVariable String code, @RequestParam String resolutionStatus) {
        return ResponseEntity.ok(ApiResponse.ok(service.endSession(code, resolutionStatus)));
    }

    @GetMapping("/customer/{id}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DialogueSession>>> getCustomerSessions(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getCustomerSessions(id)));
    }

    @GetMapping("/sessions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DialogueSession>>> listSessions(@RequestParam(required = false) String status) {
        List<DialogueSession> sessions = (status != null && !status.isBlank())
                ? sessionRepository.findByStatusOrderByStartedAtDesc(status)
                : sessionRepository.findAll();
        return ResponseEntity.ok(ApiResponse.ok(sessions));
    }

    @GetMapping("/{code}/messages")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<DialogueMessage>>> getMessages(@PathVariable String code) {
        return ResponseEntity.ok(ApiResponse.ok(service.getMessagesBySessionCode(code)));
    }
}
