package com.cbs.posterminal.mapper;

import com.cbs.posterminal.dto.RegisterTerminalRequest;
import com.cbs.posterminal.dto.TerminalResponse;
import com.cbs.posterminal.entity.PosTerminal;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-05T05:05:54+0100",
    comments = "version: 1.6.2, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class PosTerminalMapperImpl implements PosTerminalMapper {

    @Override
    public PosTerminal toEntity(RegisterTerminalRequest request) {
        if ( request == null ) {
            return null;
        }

        PosTerminal.PosTerminalBuilder posTerminal = PosTerminal.builder();

        posTerminal.acquiringBankCode( request.getAcquiringBankCode() );
        posTerminal.batchSettlementTime( request.getBatchSettlementTime() );
        posTerminal.locationAddress( request.getLocationAddress() );
        posTerminal.maxTransactionAmount( request.getMaxTransactionAmount() );
        posTerminal.merchantCategoryCode( request.getMerchantCategoryCode() );
        posTerminal.merchantId( request.getMerchantId() );
        posTerminal.merchantName( request.getMerchantName() );
        posTerminal.settlementAccountId( request.getSettlementAccountId() );
        posTerminal.softwareVersion( request.getSoftwareVersion() );
        posTerminal.supportsChip( request.getSupportsChip() );
        posTerminal.supportsContactless( request.getSupportsContactless() );
        posTerminal.supportsMagstripe( request.getSupportsMagstripe() );
        posTerminal.supportsPin( request.getSupportsPin() );
        posTerminal.supportsQr( request.getSupportsQr() );
        posTerminal.terminalId( request.getTerminalId() );
        posTerminal.terminalType( request.getTerminalType() );

        return posTerminal.build();
    }

    @Override
    public TerminalResponse toResponse(PosTerminal entity) {
        if ( entity == null ) {
            return null;
        }

        TerminalResponse.TerminalResponseBuilder terminalResponse = TerminalResponse.builder();

        terminalResponse.acquiringBankCode( entity.getAcquiringBankCode() );
        terminalResponse.batchSettlementTime( entity.getBatchSettlementTime() );
        terminalResponse.createdAt( entity.getCreatedAt() );
        terminalResponse.id( entity.getId() );
        terminalResponse.lastHeartbeatAt( entity.getLastHeartbeatAt() );
        terminalResponse.lastTransactionAt( entity.getLastTransactionAt() );
        terminalResponse.locationAddress( entity.getLocationAddress() );
        terminalResponse.maxTransactionAmount( entity.getMaxTransactionAmount() );
        terminalResponse.merchantCategoryCode( entity.getMerchantCategoryCode() );
        terminalResponse.merchantId( entity.getMerchantId() );
        terminalResponse.merchantName( entity.getMerchantName() );
        terminalResponse.operationalStatus( entity.getOperationalStatus() );
        terminalResponse.settlementAccountId( entity.getSettlementAccountId() );
        terminalResponse.softwareVersion( entity.getSoftwareVersion() );
        terminalResponse.supportsChip( entity.getSupportsChip() );
        terminalResponse.supportsContactless( entity.getSupportsContactless() );
        terminalResponse.supportsMagstripe( entity.getSupportsMagstripe() );
        terminalResponse.supportsPin( entity.getSupportsPin() );
        terminalResponse.supportsQr( entity.getSupportsQr() );
        terminalResponse.terminalId( entity.getTerminalId() );
        terminalResponse.terminalType( entity.getTerminalType() );
        terminalResponse.transactionsToday( entity.getTransactionsToday() );
        terminalResponse.updatedAt( entity.getUpdatedAt() );

        return terminalResponse.build();
    }

    @Override
    public List<TerminalResponse> toResponseList(List<PosTerminal> entities) {
        if ( entities == null ) {
            return null;
        }

        List<TerminalResponse> list = new ArrayList<TerminalResponse>( entities.size() );
        for ( PosTerminal posTerminal : entities ) {
            list.add( toResponse( posTerminal ) );
        }

        return list;
    }
}
