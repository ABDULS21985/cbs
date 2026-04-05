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
    date = "2026-04-05T14:03:25+0100",
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

        segmentDto.code( entity.getCode() );
        segmentDto.colorCode( entity.getColorCode() );
        segmentDto.createdAt( entity.getCreatedAt() );
        segmentDto.description( entity.getDescription() );
        segmentDto.icon( entity.getIcon() );
        segmentDto.id( entity.getId() );
        segmentDto.isActive( entity.getIsActive() );
        segmentDto.name( entity.getName() );
        segmentDto.priority( entity.getPriority() );
        segmentDto.rules( toRuleDtoList( entity.getRules() ) );
        segmentDto.segmentType( entity.getSegmentType() );
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

        segmentRuleDto.fieldName( entity.getFieldName() );
        segmentRuleDto.fieldValue( entity.getFieldValue() );
        segmentRuleDto.fieldValueTo( entity.getFieldValueTo() );
        segmentRuleDto.id( entity.getId() );
        segmentRuleDto.isActive( entity.getIsActive() );
        segmentRuleDto.logicalGroup( entity.getLogicalGroup() );
        segmentRuleDto.operator( entity.getOperator() );

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
        segment.colorCode( dto.getColorCode() );
        segment.description( dto.getDescription() );
        segment.icon( dto.getIcon() );
        segment.isActive( dto.getIsActive() );
        segment.name( dto.getName() );
        segment.priority( dto.getPriority() );
        segment.segmentType( dto.getSegmentType() );

        return segment.build();
    }

    @Override
    public SegmentRule toRuleEntity(SegmentRuleDto dto) {
        if ( dto == null ) {
            return null;
        }

        SegmentRule.SegmentRuleBuilder<?, ?> segmentRule = SegmentRule.builder();

        segmentRule.fieldName( dto.getFieldName() );
        segmentRule.fieldValue( dto.getFieldValue() );
        segmentRule.fieldValueTo( dto.getFieldValueTo() );
        segmentRule.isActive( dto.getIsActive() );
        segmentRule.logicalGroup( dto.getLogicalGroup() );
        segmentRule.operator( dto.getOperator() );

        return segmentRule.build();
    }

    @Override
    public void updateEntity(SegmentDto dto, Segment entity) {
        if ( dto == null ) {
            return;
        }

        if ( dto.getColorCode() != null ) {
            entity.setColorCode( dto.getColorCode() );
        }
        if ( dto.getDescription() != null ) {
            entity.setDescription( dto.getDescription() );
        }
        if ( dto.getIcon() != null ) {
            entity.setIcon( dto.getIcon() );
        }
        if ( dto.getIsActive() != null ) {
            entity.setIsActive( dto.getIsActive() );
        }
        if ( dto.getName() != null ) {
            entity.setName( dto.getName() );
        }
        if ( dto.getPriority() != null ) {
            entity.setPriority( dto.getPriority() );
        }
        if ( dto.getSegmentType() != null ) {
            entity.setSegmentType( dto.getSegmentType() );
        }
    }
}
