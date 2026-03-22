package com.cbs.agent.controller;

import com.cbs.agent.entity.*;
import com.cbs.agent.service.AgentBankingService;
import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController @RequestMapping("/v1/agents") @RequiredArgsConstructor
@Tag(name = "Agent Banking", description = "Agent onboarding, float management, commission, transaction processing")
public class AgentBankingController {

    private final AgentBankingService agentService;

    @PostMapping
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BankingAgent>> onboard(@RequestBody BankingAgent agent) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(agentService.onboardAgent(agent)));
    }

    @GetMapping("/{agentCode}")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<BankingAgent>> getAgent(@PathVariable String agentCode) {
        return ResponseEntity.ok(ApiResponse.ok(agentService.getAgent(agentCode)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<BankingAgent>>> getAgents(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<BankingAgent> result = agentService.getAgents(status, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }

    @PostMapping("/{agentCode}/transact")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<AgentTransaction>> transact(@PathVariable String agentCode,
            @RequestParam String transactionType, @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) Long accountId, @RequestParam BigDecimal amount,
            @RequestParam(required = false) String currencyCode,
            @RequestParam(required = false) BigDecimal geoLat, @RequestParam(required = false) BigDecimal geoLon) {
        return ResponseEntity.ok(ApiResponse.ok(agentService.processTransaction(
                agentCode, transactionType, customerId, accountId, amount, currencyCode, geoLat, geoLon)));
    }

    @PostMapping("/{agentCode}/float-topup")
    @PreAuthorize("hasRole('CBS_ADMIN')")
    public ResponseEntity<ApiResponse<BankingAgent>> topUpFloat(@PathVariable String agentCode, @RequestParam BigDecimal amount) {
        return ResponseEntity.ok(ApiResponse.ok(agentService.topUpFloat(agentCode, amount)));
    }

    @GetMapping("/{agentId}/transactions")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER')")
    public ResponseEntity<ApiResponse<List<AgentTransaction>>> getTransactions(@PathVariable Long agentId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<AgentTransaction> result = agentService.getAgentTransactions(agentId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), PageMeta.from(result)));
    }
}
