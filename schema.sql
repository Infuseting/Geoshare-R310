CREATE TABLE `Accessibilite` (
  `idAccessibilite` int NOT NULL,
  `name` longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `access_token` (
  `idToken` int NOT NULL,
  `access_token` varchar(256) NOT NULL,
  `idUser` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `Commune` (
  `idVille` int NOT NULL,
  `name` longtext NOT NULL,
  `codepostal` varchar(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Commune_has_EPCI` (
  `Commune_idVille` int NOT NULL,
  `EPCI_idEPCI` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `EPCI` (
  `idEPCI` int NOT NULL,
  `name` varchar(256) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `EPCI_has_Region` (
  `EPCI_idEPCI` int NOT NULL,
  `Region_idRegion` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Equipements` (
  `idEquipements` int NOT NULL,
  `nomEquipements` longtext NOT NULL,
  `typeEquipements` longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `has_Equipements` (
  `idEquipements` int NOT NULL,
  `idInfrastrcture` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Informations` (
  `idInfrastructure` varchar(20) NOT NULL,
  `idInformations` int NOT NULL,
  `texte` longtext NOT NULL,
  `apparition_date` date NOT NULL,
  `expiration_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Infrastructure` (
  `idInfrastructure` varchar(20) NOT NULL,
  `name` longtext NOT NULL,
  `adresse` longtext NOT NULL,
  `idVille` int NOT NULL,
  `informations` longtext,
  `latitude` varchar(32) NOT NULL,
  `longitude` varchar(32) NOT NULL,
  `en_service` tinyint NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `is_accessible` (
  `idInfrastructure` varchar(20) NOT NULL,
  `idAccessibilite` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Region` (
  `idRegion` int NOT NULL,
  `name` varchar(256) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `responsable` (
  `id` int NOT NULL,
  `idUser` int DEFAULT NULL,
  `idInfrastructure` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Region_idRegion` int DEFAULT NULL,
  `Commune_idVille` int DEFAULT NULL,
  `EPCI_idEPCI` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user` (
  `idUser` int NOT NULL,
  `email` longtext NOT NULL,
  `password` varchar(256) NOT NULL,
  `type` enum('PARTICULIER','ENTREPRISE','COLLECTIVITE','ASSOCIATION') NOT NULL DEFAULT 'PARTICULIER',
  `name` longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `has_Piece` (
  `idInfrastructure` varchar(20) NOT NULL,
  `idPiece` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Piece` (
  `idPiece` int NOT NULL,
  `Name` longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


--ALTER TABLE `Accessibilite`
  ADD PRIMARY KEY (`idAccessibilite`);

--
-- Indexes for table `access_token`
--
ALTER TABLE `access_token`
  ADD PRIMARY KEY (`idToken`),
  ADD KEY `fk_access_token_user_idx` (`idUser`);

--
-- Indexes for table `Commune`
--
ALTER TABLE `Commune`
  ADD PRIMARY KEY (`idVille`);

--
-- Indexes for table `Commune_has_EPCI`
--
ALTER TABLE `Commune_has_EPCI`
  ADD PRIMARY KEY (`Commune_idVille`,`EPCI_idEPCI`),
  ADD KEY `fk_Commune_has_EPCI_EPCI1_idx` (`EPCI_idEPCI`),
  ADD KEY `fk_Commune_has_EPCI_Commune1_idx` (`Commune_idVille`);

--
-- Indexes for table `EPCI`
--
ALTER TABLE `EPCI`
  ADD PRIMARY KEY (`idEPCI`);

--
-- Indexes for table `EPCI_has_Region`
--
ALTER TABLE `EPCI_has_Region`
  ADD PRIMARY KEY (`EPCI_idEPCI`,`Region_idRegion`),
  ADD KEY `fk_EPCI_has_Region_Region1_idx` (`Region_idRegion`),
  ADD KEY `fk_EPCI_has_Region_EPCI1_idx` (`EPCI_idEPCI`);

--
-- Indexes for table `Equipements`
--
ALTER TABLE `Equipements`
  ADD PRIMARY KEY (`idEquipements`);

--
-- Indexes for table `has_Equipements`
--
ALTER TABLE `has_Equipements`
  ADD PRIMARY KEY (`idEquipements`,`idInfrastrcture`),
  ADD KEY `fk_Equipements_has_Infrastructure_Infrastructure1_idx` (`idInfrastrcture`),
  ADD KEY `fk_Equipements_has_Infrastructure_Equipements1_idx` (`idEquipements`);

--
-- Indexes for table `has_Piece`
--
ALTER TABLE `has_Piece`
  ADD PRIMARY KEY (`idInfrastructure`,`idPiece`),
  ADD KEY `idPiece` (`idPiece`);

--
-- Indexes for table `Informations`
--
ALTER TABLE `Informations`
  ADD PRIMARY KEY (`idInformations`),
  ADD KEY `fk_Informations_Infrastructure1_idx` (`idInfrastructure`);

--
-- Indexes for table `Infrastructure`
--
ALTER TABLE `Infrastructure`
  ADD PRIMARY KEY (`idInfrastructure`),
  ADD KEY `fk_Infrastructure_Ville1_idx` (`idVille`);

--
-- Indexes for table `is_accessible`
--
ALTER TABLE `is_accessible`
  ADD PRIMARY KEY (`idInfrastructure`,`idAccessibilite`),
  ADD KEY `fk_Infrastructure_has_Accessibilite_Accessibilite1_idx` (`idAccessibilite`),
  ADD KEY `fk_Infrastructure_has_Accessibilite_Infrastructure1_idx` (`idInfrastructure`);

--
-- Indexes for table `Piece`
--
ALTER TABLE `Piece`
  ADD PRIMARY KEY (`idPiece`);

--
-- Indexes for table `Region`
--
ALTER TABLE `Region`
  ADD PRIMARY KEY (`idRegion`);

--
-- Indexes for table `responsable`
--
ALTER TABLE `responsable`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_user_has_Infrastructure_Infrastructure1_idx` (`idInfrastructure`),
  ADD KEY `fk_user_has_Infrastructure_user1_idx` (`idUser`),
  ADD KEY `fk_responsable_Region1_idx` (`Region_idRegion`),
  ADD KEY `fk_responsable_Commune1_idx` (`Commune_idVille`),
  ADD KEY `fk_responsable_EPCI1_idx` (`EPCI_idEPCI`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`idUser`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Accessibilite`
--
ALTER TABLE `Accessibilite`
  MODIFY `idAccessibilite` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `access_token`
--
ALTER TABLE `access_token`
  MODIFY `idToken` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `Commune`
--
ALTER TABLE `Commune`
  MODIFY `idVille` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45112;

--
-- AUTO_INCREMENT for table `Equipements`
--
ALTER TABLE `Equipements`
  MODIFY `idEquipements` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45112;

--
-- AUTO_INCREMENT for table `Informations`
--
ALTER TABLE `Informations`
  MODIFY `idInformations` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Piece`
--
ALTER TABLE `Piece`
  MODIFY `idPiece` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=93;

--
-- AUTO_INCREMENT for table `Region`
--
ALTER TABLE `Region`
  MODIFY `idRegion` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT for table `responsable`
--
ALTER TABLE `responsable`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72865;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `idUser` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72866;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `access_token`
--
ALTER TABLE `access_token`
  ADD CONSTRAINT `fk_access_token_user` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`);

--
-- Constraints for table `Commune_has_EPCI`
--
ALTER TABLE `Commune_has_EPCI`
  ADD CONSTRAINT `fk_Commune_has_EPCI_Commune1` FOREIGN KEY (`Commune_idVille`) REFERENCES `Commune` (`idVille`),
  ADD CONSTRAINT `fk_Commune_has_EPCI_EPCI1` FOREIGN KEY (`EPCI_idEPCI`) REFERENCES `EPCI` (`idEPCI`);

--
-- Constraints for table `EPCI_has_Region`
--
ALTER TABLE `EPCI_has_Region`
  ADD CONSTRAINT `fk_EPCI_has_Region_EPCI1` FOREIGN KEY (`EPCI_idEPCI`) REFERENCES `EPCI` (`idEPCI`),
  ADD CONSTRAINT `fk_EPCI_has_Region_Region1` FOREIGN KEY (`Region_idRegion`) REFERENCES `Region` (`idRegion`);

--
-- Constraints for table `has_Equipements`
--
ALTER TABLE `has_Equipements`
  ADD CONSTRAINT `fk_Equipements_has_Infrastructure_Equipements1` FOREIGN KEY (`idEquipements`) REFERENCES `Equipements` (`idEquipements`),
  ADD CONSTRAINT `fk_Equipements_has_Infrastructure_Infrastructure1` FOREIGN KEY (`idInfrastrcture`) REFERENCES `Infrastructure` (`idInfrastructure`);

--
-- Constraints for table `has_Piece`
--
ALTER TABLE `has_Piece`
  ADD CONSTRAINT `has_Piece_ibfk_1` FOREIGN KEY (`idPiece`) REFERENCES `Piece` (`idPiece`),
  ADD CONSTRAINT `has_Piece_ibfk_2` FOREIGN KEY (`idInfrastructure`) REFERENCES `Infrastructure` (`idInfrastructure`);

--
-- Constraints for table `Informations`
--
ALTER TABLE `Informations`
  ADD CONSTRAINT `fk_Informations_Infrastructure1` FOREIGN KEY (`idInfrastructure`) REFERENCES `Infrastructure` (`idInfrastructure`);

--
-- Constraints for table `Infrastructure`
--
ALTER TABLE `Infrastructure`
  ADD CONSTRAINT `fk_Infrastructure_Ville1` FOREIGN KEY (`idVille`) REFERENCES `Commune` (`idVille`);

--
-- Constraints for table `is_accessible`
--
ALTER TABLE `is_accessible`
  ADD CONSTRAINT `fk_Infrastructure_has_Accessibilite_Accessibilite1` FOREIGN KEY (`idAccessibilite`) REFERENCES `Accessibilite` (`idAccessibilite`),
  ADD CONSTRAINT `fk_Infrastructure_has_Accessibilite_Infrastructure1` FOREIGN KEY (`idInfrastructure`) REFERENCES `Infrastructure` (`idInfrastructure`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
