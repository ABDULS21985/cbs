package com.cbs.channelactivity.mapper;

import com.cbs.channelactivity.dto.ActivityLogResponse;
import com.cbs.channelactivity.dto.ActivitySummaryResponse;
import com.cbs.channelactivity.dto.LogActivityRequest;
import com.cbs.channelactivity.entity.ChannelActivityLog;
import com.cbs.channelactivity.entity.ChannelActivitySummary;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-04T17:44:54+0100",
    comments = "version: 1.6.2, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class ChannelActivityMapperImpl implements ChannelActivityMapper {

    @Override
    public ChannelActivityLog toEntity(LogActivityRequest request) {
        if ( request == null ) {
            return null;
        }

        ChannelActivityLog.ChannelActivityLogBuilder channelActivityLog = ChannelActivityLog.builder();

        Map<String, Object> map = request.getActivityDetail();
        if ( map != null ) {
            channelActivityLog.activityDetail( new LinkedHashMap<String, Object>( map ) );
        }
        channelActivityLog.activityType( request.getActivityType() );
        channelActivityLog.channel( request.getChannel() );
        channelActivityLog.customerId( request.getCustomerId() );
        channelActivityLog.deviceFingerprint( request.getDeviceFingerprint() );
        channelActivityLog.errorCode( request.getErrorCode() );
        channelActivityLog.geoLocation( request.getGeoLocation() );
        channelActivityLog.ipAddress( request.getIpAddress() );
        channelActivityLog.responseTimeMs( request.getResponseTimeMs() );
        channelActivityLog.resultStatus( request.getResultStatus() );
        channelActivityLog.sessionId( request.getSessionId() );

        return channelActivityLog.build();
    }

    @Override
    public ActivityLogResponse toLogResponse(ChannelActivityLog entity) {
        if ( entity == null ) {
            return null;
        }

        ActivityLogResponse.ActivityLogResponseBuilder activityLogResponse = ActivityLogResponse.builder();

        Map<String, Object> map = entity.getActivityDetail();
        if ( map != null ) {
            activityLogResponse.activityDetail( new LinkedHashMap<String, Object>( map ) );
        }
        activityLogResponse.activityType( entity.getActivityType() );
        activityLogResponse.channel( entity.getChannel() );
        activityLogResponse.createdAt( entity.getCreatedAt() );
        activityLogResponse.customerId( entity.getCustomerId() );
        activityLogResponse.deviceFingerprint( entity.getDeviceFingerprint() );
        activityLogResponse.errorCode( entity.getErrorCode() );
        activityLogResponse.geoLocation( entity.getGeoLocation() );
        activityLogResponse.id( entity.getId() );
        activityLogResponse.ipAddress( entity.getIpAddress() );
        activityLogResponse.logId( entity.getLogId() );
        activityLogResponse.responseTimeMs( entity.getResponseTimeMs() );
        activityLogResponse.resultStatus( entity.getResultStatus() );
        activityLogResponse.sessionId( entity.getSessionId() );

        return activityLogResponse.build();
    }

    @Override
    public List<ActivityLogResponse> toLogResponseList(List<ChannelActivityLog> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ActivityLogResponse> list = new ArrayList<ActivityLogResponse>( entities.size() );
        for ( ChannelActivityLog channelActivityLog : entities ) {
            list.add( toLogResponse( channelActivityLog ) );
        }

        return list;
    }

    @Override
    public ActivitySummaryResponse toSummaryResponse(ChannelActivitySummary entity) {
        if ( entity == null ) {
            return null;
        }

        ActivitySummaryResponse.ActivitySummaryResponseBuilder activitySummaryResponse = ActivitySummaryResponse.builder();

        activitySummaryResponse.avgResponseTimeMs( entity.getAvgResponseTimeMs() );
        activitySummaryResponse.channel( entity.getChannel() );
        activitySummaryResponse.createdAt( entity.getCreatedAt() );
        activitySummaryResponse.customerId( entity.getCustomerId() );
        activitySummaryResponse.failureCount( entity.getFailureCount() );
        activitySummaryResponse.id( entity.getId() );
        activitySummaryResponse.mostUsedActivity( entity.getMostUsedActivity() );
        activitySummaryResponse.periodDate( entity.getPeriodDate() );
        activitySummaryResponse.periodType( entity.getPeriodType() );
        activitySummaryResponse.totalAmount( entity.getTotalAmount() );
        activitySummaryResponse.totalSessions( entity.getTotalSessions() );
        activitySummaryResponse.totalTransactions( entity.getTotalTransactions() );
        activitySummaryResponse.uniqueActivities( entity.getUniqueActivities() );
        activitySummaryResponse.updatedAt( entity.getUpdatedAt() );

        return activitySummaryResponse.build();
    }

    @Override
    public List<ActivitySummaryResponse> toSummaryResponseList(List<ChannelActivitySummary> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ActivitySummaryResponse> list = new ArrayList<ActivitySummaryResponse>( entities.size() );
        for ( ChannelActivitySummary channelActivitySummary : entities ) {
            list.add( toSummaryResponse( channelActivitySummary ) );
        }

        return list;
    }
}
