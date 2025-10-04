// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentManager {
    struct Document {
        string ipfsHash;
        address owner;
        uint256 timestamp;
        string fileName;
        uint256 fileSize;
        bool isActive;
        string documentType;
    }
    
    struct SharePermission {
        address sharedWith;
        string permission; // "read" or "write"
        uint256 timestamp;
    }
    
    mapping(bytes32 => Document) public documents;
    mapping(address => bytes32[]) public userDocuments;
    mapping(bytes32 => SharePermission[]) public documentShares;
    mapping(address => bytes32[]) public sharedWithUser;
    
    event DocumentUploaded(
        bytes32 indexed documentId,
        address indexed owner,
        string ipfsHash,
        string fileName
    );
    
    event DocumentShared(
        bytes32 indexed documentId,
        address indexed owner,
        address indexed sharedWith,
        string permission
    );
    
    function uploadDocument(
        string memory _ipfsHash,
        string memory _fileName,
        uint256 _fileSize,
        string memory _documentType
    ) public returns (bytes32) {
        bytes32 documentId = keccak256(
            abi.encodePacked(
                msg.sender,
                _ipfsHash,
                block.timestamp,
                _fileName
            )
        );
        
        documents[documentId] = Document({
            ipfsHash: _ipfsHash,
            owner: msg.sender,
            timestamp: block.timestamp,
            fileName: _fileName,
            fileSize: _fileSize,
            isActive: true,
            documentType: _documentType
        });
        
        userDocuments[msg.sender].push(documentId);
        
        emit DocumentUploaded(documentId, msg.sender, _ipfsHash, _fileName);
        
        return documentId;
    }
    
    function shareDocument(
        bytes32 _documentId,
        address _shareWith,
        string memory _permission
    ) public {
        require(documents[_documentId].owner == msg.sender, "Not the owner");
        require(documents[_documentId].isActive, "Document not active");
        require(_shareWith != msg.sender, "Cannot share with yourself");
        
        documentShares[_documentId].push(SharePermission({
            sharedWith: _shareWith,
            permission: _permission,
            timestamp: block.timestamp
        }));
        
        sharedWithUser[_shareWith].push(_documentId);
        
        emit DocumentShared(_documentId, msg.sender, _shareWith, _permission);
    }
    
    function getDocument(bytes32 _documentId) public view returns (
        string memory ipfsHash,
        address owner,
        uint256 timestamp,
        string memory fileName,
        uint256 fileSize,
        bool isActive,
        string memory documentType
    ) {
        Document memory doc = documents[_documentId];
        return (
            doc.ipfsHash,
            doc.owner,
            doc.timestamp,
            doc.fileName,
            doc.fileSize,
            doc.isActive,
            doc.documentType
        );
    }
    
    function getMyDocuments() public view returns (bytes32[] memory) {
        return userDocuments[msg.sender];
    }
    
    function getSharedDocuments() public view returns (bytes32[] memory) {
        return sharedWithUser[msg.sender];
    }
    
    function getDocumentShares(bytes32 _documentId) public view returns (SharePermission[] memory) {
        require(
            documents[_documentId].owner == msg.sender || 
            isDocumentSharedWith(_documentId, msg.sender),
            "Not authorized"
        );
        return documentShares[_documentId];
    }
    
    function isDocumentSharedWith(bytes32 _documentId, address _user) public view returns (bool) {
        SharePermission[] memory shares = documentShares[_documentId];
        for (uint i = 0; i < shares.length; i++) {
            if (shares[i].sharedWith == _user) {
                return true;
            }
        }
        return false;
    }
}