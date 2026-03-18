package com.cbs.segmentation.mapper;

import com.cbs.segmentation.dto.SegmentDto;
import com.cbs.segmentation.dto.SegmentRuleDto;
import com.cbs.segmentation.entity.Segment;
import com.cbs.segmentation.entity.SegmentRule;
import java.util.ArrayList;
import java.util.List;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-03-18T01:12:19+0100",
    comments = "version: 1.6.2, compiler: Eclipse JDT (IDE) 3.45.0.v20260224-0835, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class SegmentMapperImpl implements SegmentMapper {

    @Override
    public SegmentDto toDto(Segment entity) {
        if ( entity == null ) {
            return null;
        }

        SegmentDto.SegmentDtoBuilder segmentDto = SegmentDto.builder();

        segmentDto.id( entity.getId() );
        segmentDto.code( entity.getCode() );
        segmentDto.name( entity.getName() );
        segmentDto.description( entity.getDescription() );
        segmentDto.segmentType( entity.getSegmentType() );
        segmentDto.priority( entity.getPriority() );
        segmentDto.isActive( entity.getIsActive() );
        segmentDto.colorCode( entity.getColorCode() );
        segmentDto.icon( entity.getIcon() );
        segmentDto.rules( toRuleDtoList( entity.getRules() ) );
        segmentDto.createdAt( entity.getCreatedAt() );
        segmentDto.updatedAt( entity.getUpdatedAt() );

        return segmentDto.build();
    }

    @Override
    public List<SegmentDto> toDtoList(List<Segment> entities) {
        if ( entities == null ) {
            return null;
        }

        List<SegmentDto> list = new ArrayList<SegmentDto>( entities.size() );
        for ( Segment segment : entities ) {
            list.add( toDto( segment ) );
        }

        return list;
    }

    @Override
    public SegmentRuleDto toRuleDto(SegmentRule entity) {
        if ( entity == null ) {
            return null;
        }

        SegmentRuleDto.SegmentRuleDtoBuilder segmentRuleDto = SegmentRuleDto.builder();

        segmentRuleDto.id( entity.getId() );
        segmentRuleDto.fieldName( entity.getFieldName() );
        segmentRuleDto.operator( entity.getOperator() );
        segmentRuleDto.fieldValue( entity.getFieldValue() );
        segmentRuleDto.fieldValueTo( entity.getFieldValueTo() );
        segmentRuleDto.logicalGroup( entity.getLogicalGroup() );
        segmentRuleDto.isActive( entity.getIsActive() );

        return segmentRuleDto.build();
    }

    @Override
    public List<SegmentRuleDto> toRuleDtoList(List<SegmentRule> entities) {
        if ( entities == null ) {
            return null;
        }

        List<SegmentRuleDto> list = new ArrayList<SegmentRuleDto>( entities.size() );
        for ( SegmentRule segmentRule : entities ) {
            list.add( toRuleDto( segmentRule ) );
        }

        return list;
    }

    @Override
    public Segment toEntity(SegmentDto dto) {
        if ( dto == null ) {
            return null;
        }

        Segment.SegmentBuilder<?, ?> segment = Segment.builder();

        segment.code( dto.getCode() );
        segment.name( dto.getName() );
        segment.description( dto.getDescription() );
        segment.segmentType( dto.getSegmentType() );
        segment.priority( dto.getPriority() );
        segment.isActive( dto.getIsActive() );
        segment.colorCode( dto.getColorCode() );
        segment.icon( dto.getIcon() );

        return segment.build();
    }

    @Override
    public SegmentRule toRuleEntity(SegmentRuleDto dto) {
        if ( dto == null ) {
            return null;
        }

        SegmentRule.SegmentRuleBuilder<?, ?> segmentRule = SegmentRule.builder();

        segmentRule.fieldName( dto.getFieldName() );
        segmentRule.operator( dto.getOperator() );
        segmentRule.fieldValue( dto.getFieldValue() );
        segmentRule.fieldValueTo( dto.getFieldValueTo() );
        segmentRule.logicalGroup( dto.getLogicalGroup() );
        segmentRule.isActive( dto.getIsActive() );

        return segmentRule.build();
    }

    @Override
    public void updateEntity(SegmentDto dto, Segment entity) {
        if ( dto == null ) {
            return;
        }

        if ( dto.getName() != null ) {
            entity.setName( dto.getName() );
        }
        if ( dto.getDescription() != null ) {
            entity.setDescription( dto.getDescription() );
        }
        if ( dto.getSegmentType() != null ) {
            entity.setSegmentType( dto.getSegmentType() );
        }
        if ( dto.getPriority() != null ) {
            entity.setPriority( dto.getPriority() );
        }
        if ( dto.getIsActive() != null ) {
            entity.setIsActive( dto.getIsActive() );
        }
        if ( dto.getColorCode() != null ) {
            entity.setColorCode( dto.getColorCode() );
        }
        if ( dto.getIcon() != null ) {
            entity.setIcon( dto.getIcon() );
        }
    }
}
