package com.cbs.channel.mapper;

import com.cbs.channel.dto.ChannelConfigResponse;
import com.cbs.channel.dto.ChannelSessionResponse;
import com.cbs.channel.dto.InteractionResponse;
import com.cbs.channel.dto.RegisterServicePointRequest;
import com.cbs.channel.dto.SaveChannelConfigRequest;
import com.cbs.channel.dto.ServicePointResponse;
import com.cbs.channel.dto.StartInteractionRequest;
import com.cbs.channel.dto.UpdateServicePointRequest;
import com.cbs.channel.entity.ChannelConfig;
import com.cbs.channel.entity.ChannelSession;
import com.cbs.channel.entity.ServicePoint;
import com.cbs.channel.entity.ServicePointInteraction;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-23T00:00:19+0100",
    comments = "version: 1.6.2, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class ChannelMapperImpl implements ChannelMapper {

    @Override
    public ChannelConfig toEntity(SaveChannelConfigRequest request) {
        if ( request == null ) {
            return null;
        }

        ChannelConfig.ChannelConfigBuilder channelConfig = ChannelConfig.builder();

        channelConfig.channel( request.getChannel() );
        channelConfig.dailyLimit( request.getDailyLimit() );
        channelConfig.displayName( request.getDisplayName() );
        List<String> list = request.getFeaturesEnabled();
        if ( list != null ) {
            channelConfig.featuresEnabled( new ArrayList<String>( list ) );
        }
        channelConfig.id( request.getId() );
        channelConfig.isActive( request.getIsActive() );
        channelConfig.isEnabled( request.getIsEnabled() );
        channelConfig.maintenanceWindow( request.getMaintenanceWindow() );
        channelConfig.maxTransferAmount( request.getMaxTransferAmount() );
        channelConfig.operatingHours( request.getOperatingHours() );
        channelConfig.sessionTimeoutSecs( request.getSessionTimeoutSecs() );
        List<String> list1 = request.getTransactionTypes();
        if ( list1 != null ) {
            channelConfig.transactionTypes( new ArrayList<String>( list1 ) );
        }

        return channelConfig.build();
    }

    @Override
    public ChannelConfigResponse toConfigResponse(ChannelConfig entity) {
        if ( entity == null ) {
            return null;
        }

        ChannelConfigResponse.ChannelConfigResponseBuilder channelConfigResponse = ChannelConfigResponse.builder();

        channelConfigResponse.channel( entity.getChannel() );
        channelConfigResponse.createdAt( entity.getCreatedAt() );
        channelConfigResponse.dailyLimit( entity.getDailyLimit() );
        channelConfigResponse.displayName( entity.getDisplayName() );
        List<String> list = entity.getFeaturesEnabled();
        if ( list != null ) {
            channelConfigResponse.featuresEnabled( new ArrayList<String>( list ) );
        }
        channelConfigResponse.id( entity.getId() );
        channelConfigResponse.isActive( entity.getIsActive() );
        channelConfigResponse.isEnabled( entity.getIsEnabled() );
        channelConfigResponse.maintenanceWindow( entity.getMaintenanceWindow() );
        channelConfigResponse.maxTransferAmount( entity.getMaxTransferAmount() );
        channelConfigResponse.operatingHours( entity.getOperatingHours() );
        channelConfigResponse.sessionTimeoutSecs( entity.getSessionTimeoutSecs() );
        List<String> list1 = entity.getTransactionTypes();
        if ( list1 != null ) {
            channelConfigResponse.transactionTypes( new ArrayList<String>( list1 ) );
        }
        channelConfigResponse.updatedAt( entity.getUpdatedAt() );
        channelConfigResponse.version( entity.getVersion() );

        return channelConfigResponse.build();
    }

    @Override
    public List<ChannelConfigResponse> toConfigResponseList(List<ChannelConfig> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ChannelConfigResponse> list = new ArrayList<ChannelConfigResponse>( entities.size() );
        for ( ChannelConfig channelConfig : entities ) {
            list.add( toConfigResponse( channelConfig ) );
        }

        return list;
    }

    @Override
    public void updateConfigFromRequest(SaveChannelConfigRequest request, ChannelConfig entity) {
        if ( request == null ) {
            return;
        }

        if ( request.getChannel() != null ) {
            entity.setChannel( request.getChannel() );
        }
        if ( request.getDailyLimit() != null ) {
            entity.setDailyLimit( request.getDailyLimit() );
        }
        if ( request.getDisplayName() != null ) {
            entity.setDisplayName( request.getDisplayName() );
        }
        if ( entity.getFeaturesEnabled() != null ) {
            List<String> list = request.getFeaturesEnabled();
            if ( list != null ) {
                entity.getFeaturesEnabled().clear();
                entity.getFeaturesEnabled().addAll( list );
            }
        }
        else {
            List<String> list = request.getFeaturesEnabled();
            if ( list != null ) {
                entity.setFeaturesEnabled( new ArrayList<String>( list ) );
            }
        }
        if ( request.getId() != null ) {
            entity.setId( request.getId() );
        }
        if ( request.getIsActive() != null ) {
            entity.setIsActive( request.getIsActive() );
        }
        if ( request.getIsEnabled() != null ) {
            entity.setIsEnabled( request.getIsEnabled() );
        }
        if ( request.getMaintenanceWindow() != null ) {
            entity.setMaintenanceWindow( request.getMaintenanceWindow() );
        }
        if ( request.getMaxTransferAmount() != null ) {
            entity.setMaxTransferAmount( request.getMaxTransferAmount() );
        }
        if ( request.getOperatingHours() != null ) {
            entity.setOperatingHours( request.getOperatingHours() );
        }
        if ( request.getSessionTimeoutSecs() != null ) {
            entity.setSessionTimeoutSecs( request.getSessionTimeoutSecs() );
        }
        if ( entity.getTransactionTypes() != null ) {
            List<String> list1 = request.getTransactionTypes();
            if ( list1 != null ) {
                entity.getTransactionTypes().clear();
                entity.getTransactionTypes().addAll( list1 );
            }
        }
        else {
            List<String> list1 = request.getTransactionTypes();
            if ( list1 != null ) {
                entity.setTransactionTypes( new ArrayList<String>( list1 ) );
            }
        }
    }

    @Override
    public ServicePoint toEntity(RegisterServicePointRequest request) {
        if ( request == null ) {
            return null;
        }

        ServicePoint.ServicePointBuilder<?, ?> servicePoint = ServicePoint.builder();

        servicePoint.assignedStaffId( request.getAssignedStaffId() );
        servicePoint.avgServiceTimeMinutes( request.getAvgServiceTimeMinutes() );
        servicePoint.deviceId( request.getDeviceId() );
        servicePoint.isAccessible( request.getIsAccessible() );
        servicePoint.locationId( request.getLocationId() );
        servicePoint.maxConcurrentCustomers( request.getMaxConcurrentCustomers() );
        Map<String, Object> map = request.getOperatingHours();
        if ( map != null ) {
            servicePoint.operatingHours( new LinkedHashMap<String, Object>( map ) );
        }
        servicePoint.servicePointName( request.getServicePointName() );
        servicePoint.servicePointType( request.getServicePointType() );
        servicePoint.staffRequired( request.getStaffRequired() );
        servicePoint.status( request.getStatus() );
        Map<String, Object> map1 = request.getSupportedServices();
        if ( map1 != null ) {
            servicePoint.supportedServices( new LinkedHashMap<String, Object>( map1 ) );
        }

        return servicePoint.build();
    }

    @Override
    public ServicePointResponse toServicePointResponse(ServicePoint entity) {
        if ( entity == null ) {
            return null;
        }

        ServicePointResponse.ServicePointResponseBuilder servicePointResponse = ServicePointResponse.builder();

        servicePointResponse.assignedStaffId( entity.getAssignedStaffId() );
        servicePointResponse.avgServiceTimeMinutes( entity.getAvgServiceTimeMinutes() );
        servicePointResponse.createdAt( entity.getCreatedAt() );
        servicePointResponse.deviceId( entity.getDeviceId() );
        servicePointResponse.id( entity.getId() );
        servicePointResponse.isAccessible( entity.getIsAccessible() );
        servicePointResponse.locationId( entity.getLocationId() );
        servicePointResponse.maxConcurrentCustomers( entity.getMaxConcurrentCustomers() );
        Map<String, Object> map = entity.getOperatingHours();
        if ( map != null ) {
            servicePointResponse.operatingHours( new LinkedHashMap<String, Object>( map ) );
        }
        servicePointResponse.servicePointCode( entity.getServicePointCode() );
        servicePointResponse.servicePointName( entity.getServicePointName() );
        servicePointResponse.servicePointType( entity.getServicePointType() );
        servicePointResponse.staffRequired( entity.getStaffRequired() );
        servicePointResponse.status( entity.getStatus() );
        Map<String, Object> map1 = entity.getSupportedServices();
        if ( map1 != null ) {
            servicePointResponse.supportedServices( new LinkedHashMap<String, Object>( map1 ) );
        }
        servicePointResponse.updatedAt( entity.getUpdatedAt() );

        return servicePointResponse.build();
    }

    @Override
    public List<ServicePointResponse> toServicePointResponseList(List<ServicePoint> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ServicePointResponse> list = new ArrayList<ServicePointResponse>( entities.size() );
        for ( ServicePoint servicePoint : entities ) {
            list.add( toServicePointResponse( servicePoint ) );
        }

        return list;
    }

    @Override
    public void updateServicePointFromRequest(UpdateServicePointRequest request, ServicePoint entity) {
        if ( request == null ) {
            return;
        }

        if ( request.getAssignedStaffId() != null ) {
            entity.setAssignedStaffId( request.getAssignedStaffId() );
        }
        if ( request.getAvgServiceTimeMinutes() != null ) {
            entity.setAvgServiceTimeMinutes( request.getAvgServiceTimeMinutes() );
        }
        if ( request.getDeviceId() != null ) {
            entity.setDeviceId( request.getDeviceId() );
        }
        if ( request.getIsAccessible() != null ) {
            entity.setIsAccessible( request.getIsAccessible() );
        }
        if ( request.getLocationId() != null ) {
            entity.setLocationId( request.getLocationId() );
        }
        if ( request.getMaxConcurrentCustomers() != null ) {
            entity.setMaxConcurrentCustomers( request.getMaxConcurrentCustomers() );
        }
        if ( entity.getOperatingHours() != null ) {
            Map<String, Object> map = request.getOperatingHours();
            if ( map != null ) {
                entity.getOperatingHours().clear();
                entity.getOperatingHours().putAll( map );
            }
        }
        else {
            Map<String, Object> map = request.getOperatingHours();
            if ( map != null ) {
                entity.setOperatingHours( new LinkedHashMap<String, Object>( map ) );
            }
        }
        if ( request.getServicePointName() != null ) {
            entity.setServicePointName( request.getServicePointName() );
        }
        if ( request.getServicePointType() != null ) {
            entity.setServicePointType( request.getServicePointType() );
        }
        if ( request.getStaffRequired() != null ) {
            entity.setStaffRequired( request.getStaffRequired() );
        }
        if ( request.getStatus() != null ) {
            entity.setStatus( request.getStatus() );
        }
        if ( entity.getSupportedServices() != null ) {
            Map<String, Object> map1 = request.getSupportedServices();
            if ( map1 != null ) {
                entity.getSupportedServices().clear();
                entity.getSupportedServices().putAll( map1 );
            }
        }
        else {
            Map<String, Object> map1 = request.getSupportedServices();
            if ( map1 != null ) {
                entity.setSupportedServices( new LinkedHashMap<String, Object>( map1 ) );
            }
        }
    }

    @Override
    public ServicePointInteraction toEntity(StartInteractionRequest request) {
        if ( request == null ) {
            return null;
        }

        ServicePointInteraction.ServicePointInteractionBuilder servicePointInteraction = ServicePointInteraction.builder();

        servicePointInteraction.channelUsed( request.getChannelUsed() );
        servicePointInteraction.customerId( request.getCustomerId() );
        servicePointInteraction.interactionType( request.getInteractionType() );
        servicePointInteraction.staffAssisted( request.getStaffAssisted() );
        servicePointInteraction.staffId( request.getStaffId() );

        return servicePointInteraction.build();
    }

    @Override
    public InteractionResponse toInteractionResponse(ServicePointInteraction entity) {
        if ( entity == null ) {
            return null;
        }

        InteractionResponse.InteractionResponseBuilder interactionResponse = InteractionResponse.builder();

        interactionResponse.channelUsed( entity.getChannelUsed() );
        interactionResponse.createdAt( entity.getCreatedAt() );
        interactionResponse.customerId( entity.getCustomerId() );
        interactionResponse.customerSatisfactionScore( entity.getCustomerSatisfactionScore() );
        interactionResponse.durationSeconds( entity.getDurationSeconds() );
        interactionResponse.endedAt( entity.getEndedAt() );
        interactionResponse.feedbackComment( entity.getFeedbackComment() );
        interactionResponse.id( entity.getId() );
        interactionResponse.interactionType( entity.getInteractionType() );
        interactionResponse.outcome( entity.getOutcome() );
        interactionResponse.servicePointId( entity.getServicePointId() );
        interactionResponse.sessionId( entity.getSessionId() );
        interactionResponse.staffAssisted( entity.getStaffAssisted() );
        interactionResponse.staffId( entity.getStaffId() );
        interactionResponse.startedAt( entity.getStartedAt() );

        return interactionResponse.build();
    }

    @Override
    public ChannelSessionResponse toSessionResponse(ChannelSession entity) {
        if ( entity == null ) {
            return null;
        }

        ChannelSessionResponse.ChannelSessionResponseBuilder channelSessionResponse = ChannelSessionResponse.builder();

        channelSessionResponse.channel( entity.getChannel() );
        Map<String, Object> map = entity.getContextData();
        if ( map != null ) {
            channelSessionResponse.contextData( new LinkedHashMap<String, Object>( map ) );
        }
        channelSessionResponse.createdAt( entity.getCreatedAt() );
        channelSessionResponse.customerId( entity.getCustomerId() );
        channelSessionResponse.deviceId( entity.getDeviceId() );
        channelSessionResponse.deviceType( entity.getDeviceType() );
        channelSessionResponse.endedAt( entity.getEndedAt() );
        channelSessionResponse.geoLatitude( entity.getGeoLatitude() );
        channelSessionResponse.geoLongitude( entity.getGeoLongitude() );
        channelSessionResponse.handoffFromChannel( entity.getHandoffFromChannel() );
        channelSessionResponse.id( entity.getId() );
        channelSessionResponse.ipAddress( entity.getIpAddress() );
        channelSessionResponse.lastActivityAt( entity.getLastActivityAt() );
        channelSessionResponse.parentSessionId( entity.getParentSessionId() );
        channelSessionResponse.sessionId( entity.getSessionId() );
        channelSessionResponse.startedAt( entity.getStartedAt() );
        channelSessionResponse.status( entity.getStatus() );
        channelSessionResponse.timeoutSeconds( entity.getTimeoutSeconds() );
        channelSessionResponse.userAgent( entity.getUserAgent() );

        return channelSessionResponse.build();
    }

    @Override
    public List<ChannelSessionResponse> toSessionResponseList(List<ChannelSession> entities) {
        if ( entities == null ) {
            return null;
        }

        List<ChannelSessionResponse> list = new ArrayList<ChannelSessionResponse>( entities.size() );
        for ( ChannelSession channelSession : entities ) {
            list.add( toSessionResponse( channelSession ) );
        }

        return list;
    }
}
