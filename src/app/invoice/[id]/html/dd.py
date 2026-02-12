import streamlit as st
import polars as pl
import pandas as pd
import oracledb
import sqlite3
import os
import tempfile
from datetime import date

# Function to get SQLite connection
def get_sqlite_connection(db_path):
    try:
        # connectorx requires URI for sqlite: sqlite://path/to/db
        return f"sqlite://{os.path.abspath(db_path)}"
    except Exception as e:
        st.error(f"Error connecting to SQLite: {e}")
        return None

# Function to get Oracle connection URI
def get_oracle_uri(user, password, dsn):
    # connectorx expects oracle://user:password@dsn
    return f"oracle://{user}:{password}@{dsn}"

# Function to get Oracle DBAPI connection (fallback or for other uses)
def get_oracle_connection_obj(user, password, dsn):
    try:
         return oracledb.connect(user=user, password=password, dsn=dsn)
    except Exception as e:
        st.error(f"Error: {e}")
        return None

# Function to generate sample data
def generate_sample_data():
    left_db_path = "sample_left.db"
    right_db_path = "sample_right.db"

    # remove if exists
    if os.path.exists(left_db_path):
        os.remove(left_db_path)
    if os.path.exists(right_db_path):
        os.remove(right_db_path)

    # Generate Data using Polars
    num_rows = 10000
    
    # Efficiently create data with Polars expressions or numpy/range
    ids = list(range(1, num_rows + 1))
    
    df_left = pl.DataFrame({
        'id': ids,
        'col1_str': [f'Value_{i}' for i in ids],
        'col2_int': [i * 10 for i in ids],
        'col3_float': [i * 1.5 for i in ids],
        'col4_date': [date(2023, 1, 1) for _ in ids],
        'col5_email': [f'user{i}@example.com' for i in ids],
        'col6_status': ['Active' if i % 2 == 0 else 'Inactive' for i in ids],
        'col7_dept': ['Engineering' if i % 3 == 0 else 'HR' for i in ids],
        'col8_code': [f'CODE-{i}' for i in ids],
        'col9_score': [i % 100 for i in ids],
        'col10_flag': [1 for _ in ids],
        'col11_desc': [f'Description for item {i}' for i in ids],
        'col12_cat': ['A' for _ in ids],
        'col13_meta': ['None' for _ in ids],
        'col14_json': ['{}' for _ in ids],
        'col15_notes': ['Nothing' for _ in ids]
    })
    
    # Clone for right
    df_right = df_left.clone()

    # Introduce Mismatches in Right DB using Polars update syntax
    # 1. Modify some values
    # Polars doesn't have loc like pandas. We use `with_columns` and `when/then`.
    
    # Row 1 (id=1) mismatch
    df_right = df_right.with_columns(
        pl.when(pl.col("id") == 1).then(pl.lit("Value_1_Modified")).otherwise(pl.col("col1_str")).alias("col1_str")
    )
    
    # Row 11 (id=11) mismatch
    df_right = df_right.with_columns(
        pl.when(pl.col("id") == 11).then(pl.lit(99999)).otherwise(pl.col("col2_int")).alias("col2_int")
    )

    # Row 101 (id=101) mismatch
    df_right = df_right.with_columns(
        pl.when(pl.col("id") == 101).then(pl.lit("Pending")).otherwise(pl.col("col6_status")).alias("col6_status")
    )
    
    # 2. Add extra rows to Right
    extra_row = pl.DataFrame({
         'id': [num_rows + 1], 'col1_str': ['Extra_Row'], 'col2_int': [0], 'col3_float': [0.0],
         'col4_date': [date(2023, 1, 1)], 'col5_email': ['extra@example.com'], 'col6_status': ['New'],
         'col7_dept': ['Sales'], 'col8_code': ['EXTRA'], 'col9_score': [0], 'col10_flag': [0],
         'col11_desc': ['Extra'], 'col12_cat': ['B'], 'col13_meta': ['N/A'], 'col14_json': ['{}'], 'col15_notes': ['Extra']
    })
    df_right = pl.concat([df_right, extra_row])

    # 3. Delete some rows from Right (Row 5 missing in right, id=5)
    df_right = df_right.filter(pl.col("id") != 5)

    # Save to SQLite
    # Polars write_database uses SQLAlchemy URI string usually
    # For simple sqlite export we can use connectorx or adbc if available, or just pandas fallback if needed.
    # But let's use sqlite3 standard + polars built-in `write_database` (needs alchemy) or just `to_pandas().to_sql()`
    # To keep dependencies low, let's use sqlite3 cursor? No, that's complex.
    # `df.write_database("table_name", "sqlite:///path.db")` requires adbc_driver_sqlite or sqlalchemy.
    # We have neither in requirements (only connectorx for reading).
    # Simple fallback: Convert to pandas just for writing sample data (since we have pandas installed as dependency of streamlit anyway? No we removed it from reqs? 
    # Wait, streamlit depends on pandas. So pandas IS available.
    
    conn = sqlite3.connect(left_db_path)
    df_left.to_pandas().to_sql('employees', conn, index=False)
    conn.close()

    conn = sqlite3.connect(right_db_path)
    df_right.to_pandas().to_sql('employees', conn, index=False)
    conn.close()

    return left_db_path, right_db_path

# Function to compare dataframes
def compare_dataframes(df_l, df_r):
    # 1. Schema check
    if df_l.columns != df_r.columns:
         return None, f"❌ Column mismatch: {df_l.columns} vs {df_r.columns}"
    
    # 2. Add row index to track original position
    df_l = df_l.with_row_index("row_idx")
    df_r = df_r.with_row_index("row_idx")
    
    # Rename columns for clear Left/Right distinction
    # Keep row_idx without suffix for joining
    base_cols = [c for c in df_l.columns if c != "row_idx"]
    
    df_l_renamed = df_l.select(
        [pl.col("row_idx")] + 
        [pl.col(c).alias(f"{c}_left") for c in base_cols]
    )
    
    df_r_renamed = df_r.select(
        [pl.col("row_idx")] + 
        [pl.col(c).alias(f"{c}_right") for c in base_cols]
    )
    
    try:
        # Full join to catch all rows
        joined = df_l_renamed.join(df_r_renamed, on="row_idx", how="full")
        
        # Build filter expression to find mismatches
        diff_conditions = []
        for col in base_cols:
            left_col = f"{col}_left"
            right_col = f"{col}_right"
            # Compare including null handling
            diff_conditions.append(pl.col(left_col).ne_missing(pl.col(right_col)))
        
        if not diff_conditions:
             return pl.DataFrame(), None
             
        # Filter rows where at least one column differs
        mismatches = joined.filter(pl.any_horizontal(diff_conditions))
        
        return mismatches, None
        
    except Exception as e:
        return None, f"Error during comparison: {e}"

# Main App Layout
def main():
    st.set_page_config(layout="wide", page_title="DB Compare (Polars)")

    st.markdown("""
    <style>
        .stApp { background-color: #0e1117; color: #fafafa; }
        .stButton>button { background-color: #ff4b4b; color: white; border-radius: 5px; }
        h1, h2, h3 { font-family: 'Inter', sans-serif; }
    </style>
    """, unsafe_allow_html=True)

    st.title("⚡ Database Comparison Tool (Polars Edition)")
    st.markdown("Compare data between **Oracle** and **SQLite** environments using high-performance Polars.")

    # Sidebar Configuration
    with st.sidebar:
        st.header("Configuration")
        
        st.markdown("### 🛠️ Sample Data")
        if st.button("Generate Sample SQLite DBs"):
            l_path, r_path = generate_sample_data()
            st.session_state['left_db_path'] = os.path.abspath(l_path)
            st.session_state['right_db_path'] = os.path.abspath(r_path)
            st.success("Sample data generated (10k rows)!")
            st.info(f"Left: {os.path.abspath(l_path)}")
            st.info(f"Right: {os.path.abspath(r_path)}")

        st.markdown("---")

        # Left Side
        st.subheader("Left Environment")
        left_type = st.selectbox("Type", ["SQLite", "Oracle"], key="left_type")
        if left_type == "Oracle":
            l_user = st.text_input("User", key="l_user")
            l_pass = st.text_input("Password", type="password", key="l_pass")
            l_dsn = st.text_input("DSN (host:port/service)", key="l_dsn")
        else:
            default_l_path = st.session_state.get('left_db_path', 'sample_left.db')
            l_db_path = st.text_input("DB Path", value=default_l_path, key="l_db_path")

        st.markdown("---")
        # Right Side
        st.subheader("Right Environment")
        right_type = st.selectbox("Type", ["SQLite", "Oracle"], key="right_type")
        if right_type == "Oracle":
            r_user = st.text_input("User", key="r_user")
            r_pass = st.text_input("Password", type="password", key="r_pass")
            r_dsn = st.text_input("DSN (host:port/service)", key="r_dsn")
        else:
            default_r_path = st.session_state.get('right_db_path', 'sample_right.db')
            r_db_path = st.text_input("DB Path", value=default_r_path, key="r_db_path")

    # Main Query Area
    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Left Query")
        left_query = st.text_area("SQL", height=150, value="SELECT * FROM employees ORDER BY id", key="l_sql")
    with col2:
        st.subheader("Right Query")
        right_query = st.text_area("SQL", height=150, value="SELECT * FROM employees ORDER BY id", key="r_sql")

    # Initialize session state
    if 'comparison_run' not in st.session_state:
        st.session_state.update({
            'comparison_run': False,
            'df_left': None, 'df_right': None,
            'comparison_df': None, 'error_msg': None
        })

    if st.button("Compare Data 🚀", use_container_width=True):
        if not left_query or not right_query:
            st.error("Please provide queries for both sides.")
            st.stop()
        
        # Reset
        st.session_state.update({
            'comparison_run': True, 'error_msg': None,
            'df_left': None, 'df_right': None, 'comparison_df': None
        })

        # FETCH LEFT
        try:
            if left_type == "Oracle":
                if not (l_user and l_pass and l_dsn):
                    st.session_state['error_msg'] = "Missing Oracle credentials (L)."
                else:
                    # Polars + connectorx for Oracle
                    # URI: oracle://user:pass@host:port/service
                    uri = get_oracle_uri(l_user, l_pass, l_dsn)
                    st.session_state['df_left'] = pl.read_database_uri(left_query, uri)
            else:
                if not l_db_path:
                    st.session_state['error_msg'] = "Missing SQLite path (L)."
                else:
                    uri = get_sqlite_connection(l_db_path)
                    st.session_state['df_left'] = pl.read_database_uri(left_query, uri)
        except Exception as e:
            st.session_state['error_msg'] = f"Left Fetch Error: {e}"

        # FETCH RIGHT
        if not st.session_state['error_msg']:
            try:
                if right_type == "Oracle":
                    if not (r_user and r_pass and r_dsn):
                        st.session_state['error_msg'] = "Missing Oracle credentials (R)."
                    else:
                        uri = get_oracle_uri(r_user, r_pass, r_dsn)
                        st.session_state['df_right'] = pl.read_database_uri(right_query, uri)
                else:
                     if not r_db_path:
                        st.session_state['error_msg'] = "Missing SQLite path (R)."
                     else:
                        uri = get_sqlite_connection(r_db_path)
                        st.session_state['df_right'] = pl.read_database_uri(right_query, uri)
            except Exception as e:
                st.session_state['error_msg'] = f"Right Fetch Error: {e}"

        # COMPARE
        if st.session_state['df_left'] is not None and st.session_state['df_right'] is not None:
            # Strip whitespace
            # Apply to all String columns
            df_l = st.session_state['df_left']
            df_r = st.session_state['df_right']
            
            df_l = df_l.select([
                pl.col(c).str.strip_chars() if df_l[c].dtype == pl.String else pl.col(c) 
                for c in df_l.columns
            ])
            df_r = df_r.select([
                pl.col(c).str.strip_chars() if df_r[c].dtype == pl.String else pl.col(c) 
                for c in df_r.columns
            ])
            
            st.session_state['df_left'] = df_l
            st.session_state['df_right'] = df_r

            comp_df, err = compare_dataframes(df_l, df_r)
            st.session_state['comparison_df'] = comp_df
            if err: st.session_state['error_msg'] = err

    # Display Results
    if st.session_state.get('comparison_run'):
        err = st.session_state.get('error_msg')
        if err: st.error(err)

        df_l = st.session_state.get('df_left')
        df_r = st.session_state.get('df_right')
        comp_df = st.session_state.get('comparison_df')

        if df_l is not None and df_r is not None:
            st.success(f"Data Loaded: Left={df_l.shape}, Right={df_r.shape}")
            
            with st.expander("View Raw DataFrames"):
                c1, c2 = st.columns(2)
                c1.markdown("#### Left Data")
                c1.dataframe(df_l.to_pandas())
                c2.markdown("#### Right Data")
                c2.dataframe(df_r.to_pandas())

            if comp_df is not None:
                if comp_df.is_empty():
                    st.balloons()
                    st.success("✅ Perfect Match!")
                else:
                    st.error(f"Found {comp_df.height} rows with mismatches.")
                    st.markdown("### 🔍 Mismatch Details")
                    
                    # We need to present a nice searchable dataframe.
                    # comp_df contains joined cols. Let's just show the Left side columns + row_idx for selection
                    # or better: Show keys + status?
                    # For now, let's show the full joined info but simplified
                    
                    # Convert to pandas for streamlit interaction (st.dataframe supports polars too but selection might vary)
                    # st.dataframe with on_select works best with pandas in older streamlit versions, 
                    # but modern streamlit supports pyarrow/polars. Let's try direct.
                    # We ensure row_idx is there.
                    
                    selection = st.dataframe(
                        comp_df.to_pandas(), # Convert to pandas for reliable simple indexing in UI
                        use_container_width=True,
                        on_select="rerun",
                        selection_mode="single-row"
                    )

                    if selection.selection.rows:
                        sel_idx = selection.selection.rows[0]
                        # This index implies position in the *displayed* dataframe (comp_df)
                        # So we get the row from comp_df
                        selected_row_data = comp_df.row(sel_idx, named=True)
                        original_row_idx = selected_row_data["row_idx"] # This is the original row index
                        
                        st.markdown("### 🛠️ Interactive Detail View")
                        st.info(f"Inspecting Original Row Index: {original_row_idx}")

                        # Fetch original rows
                        # Should exist in both unless it was an extra row?
                        # If row_idx is null (outer join), handle it.
                        
                        if original_row_idx is None:
                             # Try right row index?
                             # In Polars join, if we did full join, row_idx might be null if it's a right-only row?
                             # Wait, we joined on "row_idx". If it didn't match, it means indices didn't align?
                             # But we created row_idx 0..N. 
                             # If shapes differ, we might have row_idx=1000 in right but not left.
                             # If we compare by index, we assume indices align.
                             st.warning("Row alignment issue (missing index).")
                        else:
                            # Safely fetch
                            row_l = df_l.row(original_row_idx, named=True) if original_row_idx < df_l.height else None
                            # For right, we assumed alignment on index. 
                            row_r = df_r.row(original_row_idx, named=True) if original_row_idx < df_r.height else None
                            
                            # If row structure is different (e.g. extra row at end), row_r might be None or different.
                            # But compare_dataframes joined on row_idx. 
                            # So row_r should be available via the joined data. 
                            # But let's use the source DFs for cleaner display.
                            
                            detail_data = []
                            # Use Left columns as master list (derive from original schema logic)
                            # The columns in mismatches are now {col}_left and {col}_right
                            # plus row_idx
                            
                            # Reconstruct original column names from df_l (which is st.session_state)
                            # or just iterate mismatches.columns and parse? 
                            # Safe way: use df_l.columns
                            
                            base_cols = [c for c in df_l.columns if c != "row_idx"]

                            for col in base_cols:
                                left_col_name = f"{col}_left"
                                right_col_name = f"{col}_right"
                                
                                # Fetch from the selected row in mismatches df (comp_df)
                                # selected_row_data is the row from comp_df
                                val_l = selected_row_data.get(left_col_name)
                                val_r = selected_row_data.get(right_col_name)
                                
                                # Check logic
                                # Handle NaNs/Nulls
                                match = (val_l == val_r)
                                if val_l is None and val_r is None: match = True
                                
                                status = "✅ Match" if match else "❌ Mismatch"
                                detail_data.append({
                                    "Column": col, "Status": status,
                                    "Left": str(val_l), "Right": str(val_r),
                                    "Type": f"{type(val_l).__name__} vs {type(val_r).__name__}"
                                })
                                
                            def highlight_row(row):
                                return ['background-color: rgba(255, 75, 75, 0.2)'] * len(row) if row['Status'] == "❌ Mismatch" else [''] * len(row)

                            st.dataframe(pd.DataFrame(detail_data).style.apply(highlight_row, axis=1), use_container_width=True)

if __name__ == "__main__":
    main()