package com.cbs.segmentation.mapper;

import com.cbs.segmentation.dto.SegmentDto;
import com.cbs.segmentation.dto.SegmentRuleDto;
import com.cbs.segmentation.entity.Segment;
import com.cbs.segmentation.entity.SegmentRule;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface SegmentMapper {

    @Mapping(target = "customerCount", ignore = true)
    @Mapping(target = "totalBalance", ignore = true)
    @Mapping(target = "avgBalance", ignore = true)
    SegmentDto toDto(Segment entity);

    List<SegmentDto> toDtoList(List<Segment> entities);

    SegmentRuleDto toRuleDto(SegmentRule entity);

    List<SegmentRuleDto> toRuleDtoList(List<SegmentRule> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "customerSegments", ignore = true)
    @Mapping(target = "rules", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    Segment toEntity(SegmentDto dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "segment", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    SegmentRule toRuleEntity(SegmentRuleDto dto);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "customerSegments", ignore = true)
    @Mapping(target = "rules", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateEntity(SegmentDto dto, @MappingTarget Segment entity);
}
