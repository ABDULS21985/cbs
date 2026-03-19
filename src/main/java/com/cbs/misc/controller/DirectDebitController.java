package com.cbs.misc.controller;

import com.cbs.common.dto.ApiResponse;
import com.cbs.common.dto.PageMeta;
import com.cbs.payments.entity.PaymentInstruction;
import com.cbs.payments.entity.PaymentType;
import com.cbs.payments.repository.PaymentInstructionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/direct-debits")
@RequiredArgsConstructor
@Tag(name = "Direct Debits", description = "Direct debit mandates")
public class DirectDebitController {

    private final PaymentInstructionRepository paymentInstructionRepository;

    @GetMapping
    @Operation(summary = "List direct debit mandates")
    @PreAuthorize("hasAnyRole('CBS_ADMIN','CBS_OFFICER','CBS_VIEWER')")
    public ResponseEntity<ApiResponse<List<PaymentInstruction>>> listDirectDebits(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<PaymentInstruction> result = paymentInstructionRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<PaymentInstruction> directDebits = result.getContent().stream()
                .filter(p -> p.getPaymentType() == PaymentType.DIRECT_DEBIT)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(directDebits, PageMeta.from(result)));
    }
}
