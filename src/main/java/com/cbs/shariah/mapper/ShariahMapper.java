package com.cbs.shariah.mapper;

import com.cbs.shariah.dto.*;
import com.cbs.shariah.entity.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ShariahMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "memberId", ignore = true)
    @Mapping(target = "isActive", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    SsbBoardMember toEntity(CreateSsbMemberRequest request);

    SsbMemberResponse toMemberResponse(SsbBoardMember entity);

    List<SsbMemberResponse> toMemberResponseList(List<SsbBoardMember> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "fatwaNumber", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "supersededByFatwaId", ignore = true)
    @Mapping(target = "issuedByBoardId", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    FatwaRecord toEntity(CreateFatwaRequest request);

    FatwaResponse toFatwaResponse(FatwaRecord entity);

    List<FatwaResponse> toFatwaResponseList(List<FatwaRecord> entities);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "fatwaNumber", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "supersededByFatwaId", ignore = true)
    @Mapping(target = "issuedByBoardId", ignore = true)
    @Mapping(target = "approvedAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateFatwaFromRequest(UpdateFatwaRequest request, @MappingTarget FatwaRecord entity);

    ReviewRequestResponse toReviewResponse(SsbReviewRequest entity);

    List<ReviewRequestResponse> toReviewResponseList(List<SsbReviewRequest> entities);

    @Mapping(target = "memberName", ignore = true)
    VoteResponse toVoteResponse(SsbVote entity);

    List<VoteResponse> toVoteResponseList(List<SsbVote> entities);
}
