package com.chiennc.file.mapper;

import com.chiennc.file.domain.models.FileObject;
import com.chiennc.file.dto.FileInfo;
import com.chiennc.file.entity.FileMgmt;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface FileMgmtMapper {
    
    /**
     * Map FileObject domain model to FileMgmt entity for MongoDB persistence
     */
    @Mapping(target = "status", source = "status", qualifiedByName = "statusToString")
    FileMgmt fileObjectToFileMgmt(FileObject fileObject);
    
    /**
     * Map FileMgmt entity back to FileObject domain model
     */
    @Mapping(target = "status", source = "status", qualifiedByName = "stringToStatus")
    FileObject fileMgmtToFileObject(FileMgmt fileMgmt);
    
    /**
     * Legacy mapping for backward compatibility
     */
    @Mapping(target = "id", source = "name")
    FileMgmt toFileMgmt(FileInfo fileInfo);
    
    @Named("statusToString")
    default String statusToString(FileObject.FileStatus status) {
        return status != null ? status.toString() : null;
    }
    
    @Named("stringToStatus")
    default FileObject.FileStatus stringToStatus(String status) {
        return status != null ? FileObject.FileStatus.valueOf(status) : null;
    }
}

