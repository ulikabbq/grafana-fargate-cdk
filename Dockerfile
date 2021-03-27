FROM segment/chamber:2.9.1 AS chamber

FROM grafana/grafana:7.5.0 AS grafana

COPY --from=chamber /chamber /bin/chamber 

ENTRYPOINT ["chamber", "exec", "grafana", "--", "/run.sh"]