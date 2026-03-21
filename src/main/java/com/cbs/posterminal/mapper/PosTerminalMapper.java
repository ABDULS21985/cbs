package com.cbs.posterminal.mapper;

import com.cbs.posterminal.dto.RegisterTerminalRequest;
import com.cbs.posterminal.dto.TerminalResponse;
import com.cbs.posterminal.entity.PosTerminal;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PosTerminalMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "lastTransactionAt", ignore = true)
    @Mapping(target = "transactionsToday", ignore = true)
    @Mapping(target = "operationalStatus", ignore = true)
    @Mapping(target = "lastHeartbeatAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    PosTerminal toEntity(RegisterTerminalRequest request);

    TerminalResponse toResponse(PosTerminal entity);

    List<TerminalResponse> toResponseList(List<PosTerminal> entities);
}
