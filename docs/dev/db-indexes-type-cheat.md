| Index Type | Best For                         | Supported Operations        | Comments                                       |
|------------|----------------------------------|-----------------------------|------------------------------------------------|
| B-Tree     | Equality and range queries       | =, &lt;, &lt;=, &gt;, &gt;= | Default index type                             |
| Hash       | Equality queries                 | =                           | Less commonly used, fewer operations supported |
| GIN        | Full-text search, arrays, JSONB  | Various                     | Optimized for composite data types             |
| GiST       | Geometric data, complex searches | Various                     | Versatile, supports many types of searches     |
| SP-GiST    | Dynamic, partitioned data        | Various                     | Suitable for k-nearest neighbors, quadtrees    |
| BRIN       | Large, naturally clustered data  | Various                     | Efficient for large tables, time-series data   |
