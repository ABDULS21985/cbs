package com.cbs.channelactivity.mapper;

import com.cbs.channelactivity.dto.*;
import com.cbs.channelactivity.entity.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ChannelActivityMapper {

    // ─── ChannelActivityLog ──────────────────────────────────────────────────────

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "logId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    ChannelActivityLog toEntity(LogActivityRequest request);

    ActivityLogResponse toLogResponse(ChannelActivityLog entity);

    List<ActivityLogResponse> toLogResponseList(List<ChannelActivityLog> entities);

    // ─── ChannelActivitySummary ──────────────────────────────────────────────────

    ActivitySummaryResponse toSummaryResponse(ChannelActivitySummary entity);

    List<ActivitySummaryResponse> toSummaryResponseList(List<ChannelActivitySummary> entities);
}
