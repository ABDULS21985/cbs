package com.cbs.channel.mapper;

import com.cbs.channel.dto.*;
import com.cbs.channel.entity.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ChannelMapper {

    // ─── ChannelConfig ───────────────────────────────────────────────────────────

    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    ChannelConfig toEntity(SaveChannelConfigRequest request);

    ChannelConfigResponse toConfigResponse(ChannelConfig entity);

    List<ChannelConfigResponse> toConfigResponseList(List<ChannelConfig> entities);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateConfigFromRequest(SaveChannelConfigRequest request, @MappingTarget ChannelConfig entity);

    // ─── ServicePoint ────────────────────────────────────────────────────────────

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "servicePointCode", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    ServicePoint toEntity(RegisterServicePointRequest request);

    ServicePointResponse toServicePointResponse(ServicePoint entity);

    List<ServicePointResponse> toServicePointResponseList(List<ServicePoint> entities);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "servicePointCode", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateServicePointFromRequest(UpdateServicePointRequest request, @MappingTarget ServicePoint entity);

    // ─── ServicePointInteraction ─────────────────────────────────────────────────

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "servicePointId", ignore = true)
    @Mapping(target = "sessionId", ignore = true)
    @Mapping(target = "servicesUsed", ignore = true)
    @Mapping(target = "startedAt", ignore = true)
    @Mapping(target = "endedAt", ignore = true)
    @Mapping(target = "durationSeconds", ignore = true)
    @Mapping(target = "customerSatisfactionScore", ignore = true)
    @Mapping(target = "feedbackComment", ignore = true)
    @Mapping(target = "outcome", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    ServicePointInteraction toEntity(StartInteractionRequest request);

    InteractionResponse toInteractionResponse(ServicePointInteraction entity);

    // ─── ChannelSession ──────────────────────────────────────────────────────────

    ChannelSessionResponse toSessionResponse(ChannelSession entity);

    List<ChannelSessionResponse> toSessionResponseList(List<ChannelSession> entities);
}
