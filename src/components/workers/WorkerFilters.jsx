import { useState } from "react";

export default function WorkerFilters({ search, setSearch, professions, selectedProfession, setSelectedProfession }) {
	const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);

	// Sugerencias de profesiones en el campo de búsqueda principal
	const searchSuggestions = professions.filter(prof =>
		prof.service_name.toLowerCase().includes(search.toLowerCase()) && search.length > 0
	);

	const handleSelectSuggestion = (profession) => {
		setSearch(profession.service_name);
		setSelectedProfession(profession.service_type_id);
		setShowSearchSuggestions(false);
	};

	return (
		<div style={{position: "relative", marginBottom: "1.5rem"}}>
			<input 
				className="form-control form-control-lg" 
				placeholder="Buscar trabajador por nombre u oficio..." 
				value={search} 
				onChange={e => {
					setSearch(e.target.value);
					setShowSearchSuggestions(e.target.value.length > 0);
				}}
				onFocus={() => search.length > 0 && setShowSearchSuggestions(true)}
				onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
			/>
			
			{showSearchSuggestions && searchSuggestions.length > 0 && (
				<div 
					className="list-group" 
					style={{
						position: "absolute",
						top: "100%",
						left: 0,
						right: 0,
						zIndex: 1000,
						marginTop: "4px",
						maxHeight: "250px",
						overflowY: "auto"
					}}
				>
					{searchSuggestions.map(prof => (
						<button
							key={prof.service_type_id}
							type="button"
							className="list-group-item list-group-item-action text-start"
							onClick={() => handleSelectSuggestion(prof)}
						>
							⚡ {prof.service_name}
						</button>
					))}
				</div>
			)}
		</div>
	);
}