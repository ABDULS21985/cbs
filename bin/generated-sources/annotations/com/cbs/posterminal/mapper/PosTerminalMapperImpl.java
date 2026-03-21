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
    date = "2026-03-21T22:35:42+0100",
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

        posTerminal.terminalId( request.getTerminalId() );
        posTerminal.terminalType( request.getTerminalType() );
        posTerminal.merchantId( request.getMerchantId() );
        posTerminal.merchantName( request.getMerchantName() );
        posTerminal.merchantCategoryCode( request.getMerchantCategoryCode() );
        posTerminal.locationAddress( request.getLocationAddress() );
        posTerminal.supportsContactless( request.getSupportsContactless() );
        posTerminal.supportsChip( request.getSupportsChip() );
        posTerminal.supportsMagstripe( request.getSupportsMagstripe() );
        posTerminal.supportsPin( request.getSupportsPin() );
        posTerminal.supportsQr( request.getSupportsQr() );
        posTerminal.maxTransactionAmount( request.getMaxTransactionAmount() );
        posTerminal.acquiringBankCode( request.getAcquiringBankCode() );
        posTerminal.settlementAccountId( request.getSettlementAccountId() );
        posTerminal.batchSettlementTime( request.getBatchSettlementTime() );
        posTerminal.softwareVersion( request.getSoftwareVersion() );

        return posTerminal.build();
    }

    @Override
    public TerminalResponse toResponse(PosTerminal entity) {
        if ( entity == null ) {
            return null;
        }

        TerminalResponse.TerminalResponseBuilder terminalResponse = TerminalResponse.builder();

        terminalResponse.id( entity.getId() );
        terminalResponse.terminalId( entity.getTerminalId() );
        terminalResponse.terminalType( entity.getTerminalType() );
        terminalResponse.merchantId( entity.getMerchantId() );
        terminalResponse.merchantName( entity.getMerchantName() );
        terminalResponse.merchantCategoryCode( entity.getMerchantCategoryCode() );
        terminalResponse.locationAddress( entity.getLocationAddress() );
        terminalResponse.supportsContactless( entity.getSupportsContactless() );
        terminalResponse.supportsChip( entity.getSupportsChip() );
        terminalResponse.supportsMagstripe( entity.getSupportsMagstripe() );
        terminalResponse.supportsPin( entity.getSupportsPin() );
        terminalResponse.supportsQr( entity.getSupportsQr() );
        terminalResponse.maxTransactionAmount( entity.getMaxTransactionAmount() );
        terminalResponse.acquiringBankCode( entity.getAcquiringBankCode() );
        terminalResponse.settlementAccountId( entity.getSettlementAccountId() );
        terminalResponse.batchSettlementTime( entity.getBatchSettlementTime() );
        terminalResponse.lastTransactionAt( entity.getLastTransactionAt() );
        terminalResponse.transactionsToday( entity.getTransactionsToday() );
        terminalResponse.operationalStatus( entity.getOperationalStatus() );
        terminalResponse.lastHeartbeatAt( entity.getLastHeartbeatAt() );
        terminalResponse.softwareVersion( entity.getSoftwareVersion() );
        terminalResponse.createdAt( entity.getCreatedAt() );
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
